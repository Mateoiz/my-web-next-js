"use server";

import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp 
} from "firebase/firestore";

const COLLECTION_NAME = "jpcs_shirt_votes";

// --- 1. SUBMIT VOTE (Server-Side) ---
export async function submitVote(data: { fullName: string, blockSection: string, studentId: string, voteChoice: string }) {
  try {
    const cleanId = data.studentId.trim().toUpperCase().replace(/\s+/g, '');
    const cleanName = data.fullName.trim().replace(/\s+/g, ' '); 

    // Layer 2 Check: ID
    const voteRef = doc(db, COLLECTION_NAME, cleanId);
    const docSnap = await getDoc(voteRef);
    if (docSnap.exists()) {
      const existingName = docSnap.data().fullName;
      return { success: false, message: `Student ID ${cleanId} has already voted (Registered as: ${existingName}).` };
    }

    // Layer 3 Check: Name
    const nameQuery = query(
      collection(db, COLLECTION_NAME), 
      where("fullName", "==", cleanName)
    );
    const nameSnapshot = await getDocs(nameQuery);
    if (!nameSnapshot.empty) {
      return { success: false, message: `"${cleanName}" has already voted.` };
    }

    // Submit
    await setDoc(voteRef, {
      fullName: cleanName,
      blockSection: data.blockSection,
      studentId: cleanId,
      voteChoice: data.voteChoice,
      timestamp: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error("Server Vote Error:", error);
    return { success: false, message: "Connection failed. Please try again." };
  }
}

// --- 2. GET STATS (Polling) ---
export async function getVoteStats() {
  try {
    // Limit query to recent 500 to prevent massive reads, calculate totals in memory or use aggregation queries for scale
    const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'), limit(500)); 
    const snapshot = await getDocs(q);

    const counts: Record<string, number> = { shirt_1: 0, shirt_2: 0, shirt_3: 0, shirt_4: 0 };
    let total = 0;
    const recentVotes: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Tally
      const choice = data.voteChoice;
      if (choice && counts[choice] !== undefined) {
        counts[choice]++;
        total++;
      }

      // Feed (Get top 5)
      if (recentVotes.length < 5 && data.fullName) {
         recentVotes.push({
            id: docSnap.id,
            name: data.fullName.split(' ')[0], // First name only
            shirtId: choice,
            timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now()
         });
      }
    });

    return { counts, total, recentVotes };
  } catch (error) {
    console.error("Stats Error:", error);
    return null;
  }
}

// --- 3. CHECK VOTE STATUS (For Admin Reset Feature) ---
export async function checkVoteExists(studentId: string) {
    if (!studentId) return false;
    const cleanId = studentId.trim().toUpperCase().replace(/\s+/g, '');
    const docRef = doc(db, COLLECTION_NAME, cleanId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
}