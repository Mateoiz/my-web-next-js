import type { Metadata } from "next";
import "./globals.css";
// Import components
import Footer from "./components/Footer";
import Navbar from "./components/navbar"; 
import CircuitCursor from "./components/CircuitCursor"; 
// 1. Import the new component
import FloatingCubes from "./components/FloatingCubes";

export const metadata: Metadata = {
  title: "JPCS DLSAU",
  description: "Junior Philippine Computer Society",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-black">
        
        {/* 2. Add the FloatingCubes here. 
            Both background canvases share the same z-0 space. */}
        <FloatingCubes />
        <CircuitCursor />

        <Navbar />

        {/* Main content still needs relative z-10 to sit on top */}
        <main className="grow relative z-10">
          {children}
        </main>

        <Footer />
        
      </body>
    </html>
  );
}