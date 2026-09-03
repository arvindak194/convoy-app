import React, { useState } from 'react';
import { Trip } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';
import { Sparkles, MapPin, Loader2, Plus, Search, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export default function AIPanel({ trip }: { trip: Trip }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'places' | 'search'>('places');
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [searchResult, setSearchResult] = useState<string>('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setPlacesResults([]);
    setSearchResult('');
    
    try {
      if (mode === 'places') {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${trip.destination.lat}&lon=${trip.destination.lng}&limit=10`);
        const data = await res.json();
        const formatted = (data.features || []).map((f: any) => ({
          name: f.properties.name || f.properties.street || 'Unknown',
          address: [f.properties.street, f.properties.city, f.properties.state].filter(Boolean).join(', '),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
          description: f.properties.osm_value ? `Type: ${f.properties.osm_value}` : (f.properties.osm_key || 'Place')
        })).filter((p: any) => p.name !== 'Unknown');
        setPlacesResults(formatted);
      } else {
        const ai = getAI();
        if (!ai) {
          setSearchResult('AI search is not available — GEMINI_API_KEY is missing.');
        } else {
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Answer the following question related to a road trip to ${trip.destination.address}: ${query}`,
            config: {
              tools: [{ googleSearch: {} }]
            }
          });
          setSearchResult(response.text || 'No answer found.');
        }
      }
    } catch (error) {
      console.error('AI Search Error:', error);
      setSearchResult('An error occurred while searching. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStop = async (place: any) => {
    if (!auth.currentUser) return;
    try {
      const stopRef = doc(collection(db, `trips/${trip.id}/stops`));
      const newStop = {
        id: stopRef.id,
        name: place.name,
        location: {
          lat: place.lat,
          lng: place.lng,
          address: place.address
        },
        addedBy: auth.currentUser.uid,
        timestamp: Date.now()
      };
      await setDoc(stopRef, newStop);
      setPlacesResults(prev => prev.filter(r => r.name !== place.name));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${trip.id}/stops`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark/80 backdrop-blur-md border-r border-brand-light/20">
      <div className="p-4 border-b border-brand-light/20 bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <Sparkles size={18} className="text-teal-400" />
          AI Trip Assistant
        </h2>
        
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setMode('places')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'places' ? 'bg-gradient-to-r from-brand-light to-brand-mid text-white' : 'bg-brand-mid text-zinc-400 hover:bg-brand-light/40'
            }`}
          >
            <MapIcon size={14} />
            Find Places
          </button>
          <button
            onClick={() => setMode('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'search' ? 'bg-gradient-to-r from-brand-light to-brand-mid text-white' : 'bg-brand-mid text-zinc-400 hover:bg-brand-light/40'
            }`}
          >
            <Search size={14} />
            Web Search
          </button>
        </div>
      </div>

      <div className="p-4 border-b border-brand-light/20">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'places' ? "e.g., Coffee shops nearby" : "e.g., Weather at destination"}
            className="w-full bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md border border-brand-light/20 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-100 focus:outline-none focus:border-brand-light transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-2 p-2 bg-gradient-to-r from-brand-light to-brand-mid/10 hover:bg-gradient-to-r from-brand-light to-brand-mid/20 text-teal-400 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {mode === 'places' && placesResults.map((place, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md border border-brand-light/20 rounded-xl p-4 group"
            >
              <h3 className="font-medium text-sm text-zinc-100 mb-1">{place.name}</h3>
              <p className="text-xs text-zinc-400 mb-2 flex items-start gap-1">
                <MapPin size={12} className="mt-0.5 shrink-0" />
                {place.address}
              </p>
              <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{place.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddStop(place)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand-mid hover:bg-brand-light/40 text-zinc-200 text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} />
                  Add to Route
                </button>
                <button
                  onClick={async () => {
                    if (!auth.currentUser) return;
                    try {
                      await addDoc(collection(db, `users/${auth.currentUser.uid}/savedPlaces`), {
                        name: place.name,
                        address: place.address,
                        lat: place.lat,
                        lng: place.lng,
                        timestamp: Date.now()
                      });
                      alert('Saved to your places!');
                    } catch (error) {
                      console.error('Error saving place', error);
                    }
                  }}
                  className="flex items-center justify-center gap-1.5 bg-brand-mid hover:bg-brand-light/40 text-zinc-200 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                  title="Save Place"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                </button>
              </div>
            </motion.div>
          ))}
          
          {mode === 'search' && searchResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md border border-brand-light/20 rounded-xl p-4 text-sm text-zinc-300 prose prose-invert max-w-none"
            >
              <ReactMarkdown>{searchResult}</ReactMarkdown>
            </motion.div>
          )}
        </AnimatePresence>
        
        {placesResults.length === 0 && !searchResult && !loading && (
          <div className="text-center text-zinc-500 text-sm mt-8">
            {mode === 'places' 
              ? "Ask the assistant to find places to stop along your route."
              : "Ask a general question about your trip, weather, or destination."}
          </div>
        )}
      </div>
    </div>
  );
}
