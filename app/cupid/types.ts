export interface UserProfile {
  id?: string;
  email?: string;
  name: string;
  studentId: string;
  course: string;
  bio: string;
  age: string;
  height: string;
  gender: string;
  preferredGender: string;
  minAge?: string;
  maxAge?: string;

  instagram: string;
  facebook: string;
  tags: string[];
  imgs: string[];
  
  // --- OMEGLE MODE FIELDS ---
  currentMatchId?: string; // If set, they are chatting
  isSearching?: boolean;   // If true, they are in the queue
  lastSeen?: any;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
  isSystem?: boolean; // For "Partner disconnected" messages
}

export type AppState = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'SETUP_PROFILE' | 'HOME' | 'SEARCHING' | 'CHAT' | 'LOADING';