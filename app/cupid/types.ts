// Add this new interface
export interface MatchRequest {
  id: string;
  name: string;
  img: string;
  course: string;
}

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
  
  // --- MATCHING FIELDS ---
  currentMatchId?: string;
  hasRerolled?: boolean;
  isBot?: boolean;
  lastSeen?: any;
  
  // --- NEW: INCOMING REQUESTS ---
  incomingRequests?: MatchRequest[]; // Array of people who want to match
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export type AppState = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'SETUP_PROFILE' | 'HOME' | 'SCANNING' | 'MATCH_FOUND' | 'CONNECTING' | 'ITS_A_MATCH' | 'CHAT' | 'LOADING';