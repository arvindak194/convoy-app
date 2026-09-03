import React, { useState, useEffect, useRef } from 'react';
import { Trip, Message } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export default function ChatPanel({ trip }: { trip: Trip }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `trips/${trip.id}/messages`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `trips/${trip.id}/messages`));
    return () => unsubscribe();
  }, [trip.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newMessage.trim()) return;
    try {
      const msgRef = doc(collection(db, `trips/${trip.id}/messages`));
      const msg = {
        id: msgRef.id,
        text: newMessage.trim(),
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Anonymous',
        timestamp: Date.now()
      };
      await setDoc(msgRef, msg);
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `trips/${trip.id}/messages`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-dark/80 backdrop-blur-md border-l border-brand-light/20">
      <div className="p-4 border-b border-brand-light/20 bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Convoy Chat
        </h2>
        <p className="text-xs text-zinc-400 mt-1">{trip.members.length} members in trip</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === auth.currentUser?.uid;
          const showName = index === 0 || messages[index - 1].senderId !== msg.senderId;
          
          return (
            <div key={msg.id} className={twMerge('flex flex-col', isMe ? 'items-end' : 'items-start')}>
              {showName && !isMe && (
                <span className="text-xs text-zinc-500 mb-1 ml-1">{msg.senderName}</span>
              )}
              <div className={twMerge(
                'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                isMe ? 'bg-gradient-to-r from-brand-light to-brand-mid text-white rounded-tr-sm' : 'bg-brand-mid text-zinc-200 rounded-tl-sm'
              )}>
                {msg.text}
              </div>
              <span className="text-[10px] text-zinc-600 mt-1 mx-1">
                {format(msg.timestamp, 'HH:mm')}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-brand-mid/60 border border-brand-light/20 backdrop-blur-md border-t border-brand-light/20">
        <div className="relative flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-brand-dark/80 backdrop-blur-md border border-brand-light/20 rounded-full pl-4 pr-12 py-3 text-sm text-zinc-100 focus:outline-none focus:border-brand-light transition-colors"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 p-2 bg-gradient-to-r from-brand-light to-brand-mid hover:from-[#09836a] hover:to-brand-light disabled:opacity-50 disabled:hover:bg-gradient-to-r from-brand-light to-brand-mid text-white rounded-full transition-colors flex items-center justify-center"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
