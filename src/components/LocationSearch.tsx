import { useState } from 'react';
import { Search } from 'lucide-react';

interface LocationSearchProps {
  onSelect: (location: { lat: number; lng: number; address: string }) => void;
  placeholder?: string;
}

export default function LocationSearch({ onSelect, placeholder = "Search destination..." }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`);
      const data = await res.json();
      setResults(data.features || []);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-brand-mid/60 border border-brand-light/30 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brand-light transition-colors"
          placeholder={placeholder}
        />
      </div>
      
      {results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-brand-mid border border-brand-light/30 rounded-xl shadow-xl shadow-brand-dark/50 max-h-60 overflow-y-auto">
          {results.map((r, i) => {
            const name = r.properties.name || r.properties.street || r.properties.city || 'Unknown';
            const addressStr = [r.properties.city, r.properties.state, r.properties.country].filter(Boolean).join(', ');
            const fullAddr = `${name}${addressStr ? `, ${addressStr}` : ''}`;
            
            return (
              <div
                key={i}
                className="px-4 py-3 hover:bg-brand-light/40 cursor-pointer border-b border-brand-light/10 last:border-0 transition-colors"
                onClick={() => {
                  onSelect({
                    lat: r.geometry.coordinates[1],
                    lng: r.geometry.coordinates[0],
                    address: fullAddr
                  });
                  setQuery(fullAddr);
                  setResults([]);
                }}
              >
                <div className="font-medium text-sm text-zinc-200">{name}</div>
                {addressStr && <div className="text-xs text-zinc-400 mt-0.5">{addressStr}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
