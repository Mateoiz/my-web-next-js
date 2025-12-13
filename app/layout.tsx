import type { Metadata } from "next";
import "./globals.css";

// --- COMPONENT IMPORTS ---
import Footer from "./components/Footer";
import Navbar from "./components/navbar"; 
import CircuitCursor from "./components/CircuitCursor"; 
import FloatingCubes from "./components/FloatingCubes"; 
import SecretGame from "./components/SecretGame"; // <--- Imported here

export const metadata: Metadata = {
  title: "JPCS DLSAU",
  description: "Junior Philippine Computer Society - DLSAU Chapter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-black">
        
        {/* --- GLOBAL BACKGROUNDS --- */}
        {/* These sit at z-0 or -1 to stay behind content */}
        <FloatingCubes />
        <CircuitCursor />

        {/* --- GLOBAL NAVIGATION --- */}
        <Navbar />

        {/* --- MAIN PAGE CONTENT --- */}
        {/* relative z-10 ensures this sits ABOVE the background effects */}
        <main className="grow relative z-10">
          {children}
        </main>

        {/* --- FOOTER --- */}
        <Footer />
        
        {/* --- SECRET EASTER EGG --- */}
        {/* This sits on top of everything but is hidden by default */}
        <SecretGame />

      </body>
    </html>
  );
}