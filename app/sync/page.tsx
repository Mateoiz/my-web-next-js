"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/db"; // Ensure this matches your Firebase config path

export default function SyncPage() {
  const [status, setStatus] = useState("Idle. Click 'Start Sync' to begin.");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus("Fetching records from Firebase...");

    try {
      // 1. Get all documents from Firebase
      const querySnapshot = await getDocs(collection(db, "castweek_registrations"));
      const docs = querySnapshot.docs.map(doc => doc.data());

      setTotal(docs.length);
      setStatus(`Found ${docs.length} records. Sending to Google Sheets...`);

      const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbx6xxEZ_n60HObk06JhAprc2WY2fV1H2hdzbpROkHcmsNEoCgkbj1xKO9AMetpY2OLD8g/exec";

      // 2. Loop through each record and send it to the spreadsheet
      for (let i = 0; i < docs.length; i++) {
        const data = docs[i];

        await fetch(GOOGLE_SHEETS_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({
            referenceId: data.ticketRef || "N/A",
            seminarName: data.seminarTitle || "Unknown Seminar", // Uses the title saved in Firebase
            fullName: data.fullName || "Unknown Name",
            studentId: data.studentId || "N/A",
            blockSection: data.blockSection || "N/A",
            email: data.email || "N/A"
          }),
        });

        setProgress(i + 1);
        setStatus(`Synced ${i + 1} of ${docs.length} records...`);

        // 3. Pause for half a second between requests to avoid Google's rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setStatus("🎉 Sync Complete! You can check your Google Sheet now.");
    } catch (error: any) {
      console.error(error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-mono text-zinc-300">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-lg w-full text-center shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Database Sync Tool</h1>
        <p className="text-zinc-500 text-sm mb-8">
          This will grab all existing registrations from Firebase and push them to your Google Sheet.
        </p>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl w-full mb-6 disabled:opacity-50 transition-colors"
        >
          {isSyncing ? "Syncing in progress..." : "Start Sync"}
        </button>

        <div className="text-left bg-black p-4 rounded-xl border border-zinc-800">
          <p className="text-green-400 text-xs uppercase tracking-widest mb-1">Status Console</p>
          <p className="text-sm">{status}</p>
          
          {total > 0 && (
            <div className="w-full bg-zinc-800 h-2 mt-4 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full transition-all duration-300" 
                style={{ width: `${(progress / total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}