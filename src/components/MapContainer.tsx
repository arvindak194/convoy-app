import { useEffect, useState, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Trip, User, Stop } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getValhallaRoute } from '../services/routing';

import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// Fix for default Leaflet icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const destinationIcon = L.divIcon({
  className: 'custom-destination-icon',
  html: `<div style="width:32px;height:32px;background:#ef4444;border-radius:50%;border:2px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;">★</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const stopIcon = L.divIcon({
  className: 'custom-stop-icon',
  html: `<div style="width:24px;height:24px;background:#eab308;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:bold;">S</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

const createMemberIcon = (member: User, isMe: boolean) => {
  const bgClass = isMe ? '#09836a' : '#14b8a6';
  const content = member.photoURL 
    ? `<img src="${member.photoURL}" style="width:100%;height:100%;object-fit:cover;" />` 
    : member.displayName.charAt(0).toUpperCase();

  return L.divIcon({
    className: 'custom-member-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="width:32px;height:32px;border-radius:50%;border:2px solid white;background:${bgClass};overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;z-index:2;">
          ${content}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};


export default function MapContainer({ trip }: { trip: Trip }) {
  const [members, setMembers] = useState<User[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const mapRef = useRef<L.Map>(null);

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
        if (geojson && geojson.geometry && geojson.geometry.coordinates) {
          // Extract coordinates and convert [lng, lat] to [lat, lng] for Leaflet Polyline
          const coords = geojson.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          setRouteCoordinates(coords as [number, number][]);
          
          if (mapRef.current && coords.length > 0) {
            mapRef.current.fitBounds(coords, { padding: [50, 50] });
          }
        }
      } catch (err) {
        console.error("Route error", err);
      }
    };

    fetchRoute();
  }, [members, stops, trip.destination]);

  // Fix map sizing issues in WebView
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LeafletMap
      center={[trip.destination.lat, trip.destination.lng]}
      zoom={10}
      style={{ width: '100%', height: '100%', backgroundColor: '#1e1e1e' }}
      ref={mapRef}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
      />

      {/* Destination Marker */}
      <Marker position={[trip.destination.lat, trip.destination.lng]} icon={destinationIcon}>
        <Popup>{trip.destination.address}</Popup>
      </Marker>

      {/* Stops Markers */}
      {stops.map(stop => (
        <Marker key={stop.id} position={[stop.location.lat, stop.location.lng]} icon={stopIcon}>
          <Popup>
            <strong>{stop.name}</strong><br/>
            {stop.location.address}
          </Popup>
        </Marker>
      ))}

      {/* Member Locations */}
      {members.map(member => {
        if (!member.currentLocation) return null;
        const isMe = member.uid === auth.currentUser?.uid;
        return (
          <Marker 
            key={member.uid} 
            position={[member.currentLocation.lat, member.currentLocation.lng]}
            icon={createMemberIcon(member, isMe)}
            zIndexOffset={isMe ? 1000 : 0}
          >
            <Popup>{member.displayName}</Popup>
          </Marker>
        );
      })}

      {/* Route Line */}
      {routeCoordinates.length > 0 && (
        <Polyline 
          positions={routeCoordinates} 
          pathOptions={{ color: '#076653', weight: 5, opacity: 0.8 }} 
        />
      )}
    </LeafletMap>
  );
}
