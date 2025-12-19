"use client";

import { useLoading } from "../context/LoadingContext";
import Navbar from "./navbar"; 
import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";
import MusicPlayer from "./MusicPlayer";
import LoadingScreen from "./SplashScreen"; // <--- IMPORTANT: Importing your SplashScreen file

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useLoading();

  return (
    <>
      {/* If isLoading is true, show the Splash Screen */}
      {isLoading && <LoadingScreen />}

      {/* Hide main content while loading to prevent "flash" of content */}
      <div 
        className={`flex flex-col min-h-screen transition-opacity duration-700 ${
          isLoading ? "opacity-0 pointer-events-none h-screen overflow-hidden" : "opacity-100"
        }`}
      >
        <Navbar />
        <main className="grow relative z-10">
          {children}
        </main>
        <Footer />
        <ThemeToggle />
        <MusicPlayer />
      </div>
    </>
  );
}