/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { auth, handleAuthRedirect } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Trip } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TripView from './components/TripView';

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  useEffect(() => {
    handleAuthRedirect();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark/80 backdrop-blur-md flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-light border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (activeTrip) {
    return <TripView trip={activeTrip} onBack={() => setActiveTrip(null)} />;
  }

  return <Dashboard onSelectTrip={setActiveTrip} />;
}
