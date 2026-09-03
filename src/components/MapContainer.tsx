import { useEffect, useState } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Trip, User, Stop } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getValhallaRoute } from '../services/routing';

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export default function MapContainer({ trip }: { trip: Trip }) {
  const [members, setMembers] = useState<User[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeGeojson, setRouteGeojson] = useState<any>(null);

  // Watch user's own location
  useEffect(() => {
    if (!auth.currentUser) return;
    
    let watchId: string | undefined;
    
    const startWatching = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted') {
            const req = await Geolocation.requestPermissions();
            if (req.location !== 'granted') return;
          }
        }
        
        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 },
          async (pos, err) => {
            if (err || !pos) return;
            const { latitude, longitude } = pos.coords;
            try {
              const userRef = doc(db, 'users', auth.currentUser!.uid);
              await updateDoc(userRef, {
                currentLocation: {
                  lat: latitude,
                  lng: longitude,
                  timestamp: Date.now()
                }
              });
            } catch (error) {
              console.error("Error updating location", error);
            }
          }
        );
      } catch (e) {
        console.error('Geolocation error', e);
      }
    };
    
    startWatching();
    
    return () => {
      if (watchId) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }, []);

  // Listen to all members' locations
  useEffect(() => {
    const unsubscribes = trip.members.map(memberId => {
      const userRef = doc(db, 'users', memberId);
      return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const userData = { uid: docSnap.id, ...docSnap.data() } as User;
          setMembers(prev => {
            const filtered = prev.filter(m => m.uid !== memberId);
            return [...filtered, userData];
          });
        }
      }, (error) => handleFirestoreError(error, OperationType.GET, `users/${memberId}`));
    });
    return () => unsubscribes.forEach(unsub => unsub());
  }, [trip.members]);

  // Listen to stops
  useEffect(() => {
    const q = query(collection(db, `trips/${trip.id}/stops`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stopsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stop));
      setStops(stopsData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `trips/${trip.id}/stops`));
    return () => unsubscribe();
  }, [trip.id]);

  // Compute Route using Valhalla
  useEffect(() => {
    if (members.length === 0) return;
    
    // Find my location to use as origin
    const me = members.find(m => m.uid === auth.currentUser?.uid);
    if (!me?.currentLocation) return;

    const fetchRoute = async () => {
      try {
        const waypoints = [
          { lat: me.currentLocation!.lat, lng: me.currentLocation!.lng },
          ...stops.map(s => ({ lat: s.location.lat, lng: s.location.lng })),
          { lat: trip.destination.lat, lng: trip.destination.lng }
        ];

        const geojson = await getValhallaRoute(waypoints);
        if (geojson) {
          setRouteGeojson(geojson);
        }
      } catch (err) {
        console.error("Route error", err);
      }
    };

    fetchRoute();
  }, [members, stops, trip.destination]);

  return (
    <Map
      initialViewState={{
        longitude: trip.destination.lng,
        latitude: trip.destination.lat,
        zoom: 10
      }}
      mapStyle="https://tiles.openfreemap.org/styles/dark"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Destination Marker */}
      <Marker longitude={trip.destination.lng} latitude={trip.destination.lat} anchor="bottom">
        <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold pb-0.5">
          ★
        </div>
      </Marker>

      {/* Stops Markers */}
      {stops.map(stop => (
        <Marker key={stop.id} longitude={stop.location.lng} latitude={stop.location.lat} anchor="bottom">
          <div className="w-6 h-6 bg-yellow-500 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-bold pb-0.5">
            S
          </div>
        </Marker>
      ))}

      {/* Member Locations */}
      {members.map(member => {
        if (!member.currentLocation) return null;
        const isMe = member.uid === auth.currentUser?.uid;
        return (
          <Marker 
            key={member.uid} 
            longitude={member.currentLocation.lng}
            latitude={member.currentLocation.lat}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              <div className={`absolute w-10 h-10 rounded-full opacity-30 animate-ping ${isMe ? 'bg-brand-light' : 'bg-teal-500'}`} />
              <div className={`w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center overflow-hidden ${isMe ? 'bg-brand-light' : 'bg-teal-500'}`}>
                {member.photoURL ? (
                  <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-white text-xs font-bold">{member.displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          </Marker>
        );
      })}

      {/* Route Line */}
      {routeGeojson && (
        <Source id="route" type="geojson" data={routeGeojson}>
          <Layer
            id="route-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': '#076653', 'line-width': 5, 'line-opacity': 0.8 }}
          />
        </Source>
      )}
    </Map>
  );
}
