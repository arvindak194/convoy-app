import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, setDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Trip } from '../types';
import { Plus, Users, Navigation, LogOut, MapPin, Calendar } from 'lucide-react';
import { logout } from '../firebase';
import LocationSearch from './LocationSearch';

export default function Dashboard({ onSelectTrip }: { onSelectTrip: (trip: Trip) => void }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [tripName, setTripName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [destination, setDestination] = useState<{ lat: number; lng: number; address: string } | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(
      collection(db, 'trips'),
      where('members', 'array-contains', auth.currentUser.uid),
      where('status', '==', 'active')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tripData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
      setTrips(tripData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'trips'));
    return () => unsubscribe();
  }, []);

  const handleCreateTrip = async () => {
    if (!auth.currentUser || !tripName || !destination) return;
    try {
      const tripRef = doc(collection(db, 'trips'));
      const newTrip = {
        id: tripRef.id,
        name: tripName,
        destination,
        creatorId: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        status: 'active',
        createdAt: Date.now()
      };
      await setDoc(tripRef, newTrip);
      onSelectTrip(newTrip as Trip);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'trips');
    }
  };

  const handleJoinTrip = async () => {
    if (!auth.currentUser || !joinCode) return;
    try {
      const tripRef = doc(db, 'trips', joinCode);
      await updateDoc(tripRef, {
        members: arrayUnion(auth.currentUser.uid)
      });
      setJoinCode('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `trips/${joinCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark/80 backdrop-blur-md text-zinc-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-light to-brand-mid shadow-lg shadow-brand-light/20 text-teal-400 rounded-2xl flex items-center justify-center">
              <Navigation size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Convoy</h1>
          </div>
          <button onClick={logout} className="text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2">
            <LogOut size={20} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Main List Column */}
          <div className="flex-1 order-2 lg:order-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Road Trips</h2>
              <span className="text-sm text-zinc-400 font-medium">{trips.length} Active</span>
            </div>
            
            {trips.length === 0 ? (
              <div className="bg-brand-mid/30 border border-brand-light/10 border-dashed rounded-3xl p-12 text-center text-zinc-500">
                <Navigation size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">You don't have any active trips.</p>
                <p className="text-sm mt-1">Create or join one to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trips.map(trip => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    key={trip.id}
                    onClick={() => onSelectTrip(trip)}
                    className="bg-brand-mid/40 border border-brand-light/20 backdrop-blur-md rounded-2xl p-6 cursor-pointer hover:bg-brand-mid/60 transition-all group shadow-sm hover:shadow-brand-light/5"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-xl group-hover:text-teal-400 transition-colors">{trip.name}</h3>
                          <span className="bg-brand-light/20 text-teal-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 flex items-center gap-1.5 line-clamp-1 mt-2">
                          <MapPin size={16} className="text-brand-light" />
                          {trip.destination.address}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5 text-zinc-400 bg-brand-dark/50 px-3 py-1.5 rounded-lg border border-brand-light/10">
                          <Users size={16} className="text-teal-500" />
                          <span className="font-medium text-zinc-200">{trip.members.length}</span>
                        </div>
                        <div className="text-xs font-mono text-zinc-500 flex flex-col items-end">
                          <span>Trip ID</span>
                          <span className="text-zinc-300 bg-brand-dark/50 px-2 py-0.5 rounded border border-brand-light/10 mt-1">{trip.id}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-[400px] shrink-0 space-y-6 order-1 lg:order-2">
            <div className="bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-brand-dark/20">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-zinc-100">
                <Plus size={20} className="text-teal-400" />
                Start a New Trip
              </h2>
              {isCreating ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Trip Name</label>
                    <input
                      type="text"
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                      className="w-full bg-brand-dark/80 border border-brand-light/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-light transition-colors"
                      placeholder="e.g., Summer Road Trip"
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Destination</label>
                    <LocationSearch 
                      onSelect={(loc) => setDestination(loc)}
                      placeholder="Search destination..." 
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setIsCreating(false)}
                      className="flex-1 bg-brand-dark hover:bg-brand-mid border border-brand-light/20 text-zinc-300 font-medium py-3 px-4 rounded-xl transition-colors text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTrip}
                      disabled={!tripName || !destination}
                      className="flex-1 bg-gradient-to-r from-brand-light to-brand-mid hover:from-[#09836a] hover:to-brand-light disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors shadow-lg shadow-brand-light/20 text-sm"
                    >
                      Create Route
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-gradient-to-r from-brand-light/10 to-brand-mid/20 hover:from-brand-light/20 hover:to-brand-mid/30 text-teal-400 border border-brand-light/20 font-semibold py-4 px-4 rounded-xl transition-colors"
                >
                  Create New Route
                </button>
              )}
            </div>

            <div className="bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-brand-dark/20">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-zinc-100">
                <Users size={20} className="text-teal-300" />
                Join a Convoy
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="flex-1 bg-brand-dark/80 border border-brand-light/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-light transition-colors font-mono placeholder:text-zinc-600 uppercase"
                  placeholder="Enter Trip ID"
                />
                <button
                  onClick={handleJoinTrip}
                  disabled={!joinCode}
                  className="bg-brand-light hover:bg-teal-500 disabled:opacity-50 disabled:hover:bg-brand-light text-white font-medium py-3 px-6 rounded-xl transition-colors text-sm shadow-lg shadow-brand-light/20"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
