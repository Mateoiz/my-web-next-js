"use client"; // <-- This is the magic key we were missing!

import dynamic from "next/dynamic";

// Next.js will completely skip server-side rendering for this route,
// guaranteeing no more Firebase Server "permission-denied" errors!
const DashboardClient = dynamic(() => import("./DashboardClient"), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <span className="w-12 h-12 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin mb-6" />
      <div className="text-zinc-400 font-mono text-sm font-bold tracking-widest uppercase animate-pulse">Initializing Dashboard...</div>
    </div>
  )
});

export default function DashboardPage() {
  return <DashboardClient />;
}