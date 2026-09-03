import { useState } from 'react';
import { Trip } from '../types';
import MapContainer from './MapContainer';
import ChatPanel from './ChatPanel';
import AIPanel from './AIPanel';
import { ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';

export default function TripView({ trip, onBack }: { trip: Trip; onBack: () => void }) {
  const [activePanel, setActivePanel] = useState<'chat' | 'ai' | null>(null);

  return (
    <div className="flex flex-col h-screen bg-brand-dark/80 backdrop-blur-md text-zinc-100 overflow-hidden">
      <header className="h-16 border-b border-brand-light/20 bg-brand-dark/80 backdrop-blur-md flex items-center justify-between px-4 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-brand-mid rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-lg leading-tight">{trip.name}</h1>
            <p className="text-xs text-zinc-400">ID: {trip.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium ${
              activePanel === 'ai' ? 'bg-gradient-to-r from-brand-light to-brand-mid text-white' : 'bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md hover:bg-brand-mid text-teal-400'
            }`}
          >
            <Sparkles size={18} />
            <span className="hidden sm:inline">Assistant</span>
          </button>
          <button
            onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
            className={`p-2 rounded-xl transition-colors flex items-center gap-2 text-sm font-medium ${
              activePanel === 'chat' ? 'bg-gradient-to-r from-[#0c342c] to-[#076653] text-white' : 'bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md hover:bg-brand-mid text-teal-300'
            }`}
          >
            <MessageSquare size={18} />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md">
          <MapContainer trip={trip} />
        </div>

        {activePanel === 'chat' && (
          <div className="w-full sm:w-80 md:w-96 absolute sm:relative right-0 top-0 bottom-0 z-20 shadow-2xl">
            <ChatPanel trip={trip} />
          </div>
        )}

        {activePanel === 'ai' && (
          <div className="w-full sm:w-80 md:w-96 absolute sm:relative right-0 top-0 bottom-0 z-20 shadow-2xl">
            <AIPanel trip={trip} />
          </div>
        )}
      </div>
    </div>
  );
}
