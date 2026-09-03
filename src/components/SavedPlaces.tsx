import { useState, useEffect } from 'react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { SavedPlace } from '../types';
import { Bookmark, MapPin, Trash2 } from 'lucide-react';

export default function SavedPlaces({ onSelect }: { onSelect: (place: SavedPlace) => void }) {
  const [places, setPlaces] = useState<SavedPlace[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, `users/${auth.currentUser.uid}/savedPlaces`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const placesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedPlace));
      setPlaces(placesData);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/savedPlaces`));
    return () => unsubscribe();
  }, []);

  const handleDelete = async (e: React.MouseEvent, placeId: string) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/savedPlaces/${placeId}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${auth.currentUser.uid}/savedPlaces/${placeId}`);
    }
  };

  if (places.length === 0) return null;

  return (
    <div className="bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md rounded-3xl p-6 shadow-xl shadow-brand-dark/20 mt-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-zinc-100">
        <Bookmark size={20} className="text-teal-400" />
        Saved Places
      </h2>
      <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
        {places.map(place => (
          <div 
            key={place.id}
            onClick={() => onSelect(place)}
            className="group flex items-center justify-between p-3 bg-brand-dark/50 hover:bg-brand-light/20 rounded-xl cursor-pointer transition-colors border border-brand-light/10"
          >
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-medium text-zinc-200 truncate">{place.name}</h3>
              <p className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-1">
                <MapPin size={12} className="shrink-0" />
                {place.address}
              </p>
            </div>
            <button
              onClick={(e) => handleDelete(e, place.id)}
              className="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
              title="Remove"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
