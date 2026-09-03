export interface User {
  uid: string;
  displayName: string;
  photoURL?: string;
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: number;
  };
}

export interface Trip {
  id: string;
  name: string;
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  creatorId: string;
  members: string[];
  status: 'active' | 'completed';
  createdAt: number;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export interface Stop {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  addedBy: string;
  timestamp: number;
}
