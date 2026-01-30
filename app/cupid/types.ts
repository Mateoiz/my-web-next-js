export interface UserProfile {
  id?: string;
  email?: string; // Ensure email is here if you use it
  name: string;
  studentId: string;
  course: string;
  bio: string;
  age: string;
  height: string;
  gender: string;
  preferredGender: string;
  
  // --- NEW FIELDS ---
  minAge?: string;
  maxAge?: string;
  // ------------------

  instagram: string;
  facebook: string;
  tags: string[];
  imgs: string[];
  currentMatchId?: string;
  hasRerolled?: boolean;
  isBot?: boolean;
  lastSeen?: any; 
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
}

export type AppState = 'WELCOME' | 'LOGIN' | 'SIGNUP' | 'SETUP_PROFILE' | 'HOME' | 'SCANNING' | 'MATCH_FOUND' | 'CONNECTING' | 'ITS_A_MATCH' | 'CHAT' | 'LOADING';