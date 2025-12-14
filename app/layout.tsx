import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers"; 
import ThemeToggle from "./components/ThemeToggle";

// --- COMPONENT IMPORTS ---
import Footer from "./components/Footer";
import Navbar from "./components/navbar"; // Note: Ensure casing matches file name (Navbar vs navbar)
import CircuitCursor from "./components/CircuitCursor"; 
import FloatingCubes from "./components/FloatingCubes"; 
import SecretGame from "./components/SecretGame"; 

export const metadata: Metadata = {
  title: "JPCS DLSAU",
  description: "Junior Philippine Computer Society - DLSAU Chapter",
  openGraph: {
    title: "JPCS DLSAU",
    description: "Junior Philippine Computer Society - DLSAU Chapter",
    images: [
      {
        url: "/og-image.jpg", 
        width: 1200,
        height: 630,
        alt: "JPCS DLSAU Preview Image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JPCS DLSAU",
    description: "Junior Philippine Computer Society - DLSAU Chapter",
    images: ["/og-image.png"], 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning is needed for next-themes to work without errors
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col transition-colors duration-300 bg-white dark:bg-black text-zinc-900 dark:text-white">
        
        {/* WRAP EVERYTHING INSIDE PROVIDERS */}
        <Providers>
          
          {/* --- GLOBAL BACKGROUNDS --- */}
          <FloatingCubes />
          <CircuitCursor />

          {/* --- GLOBAL NAVIGATION --- */}
          <Navbar />

          {/* --- MAIN PAGE CONTENT --- */}
          <main className="grow relative z-10">
            {children}
          </main>

          {/* --- FOOTER & TOOLS --- */}
          <Footer />
          <ThemeToggle />
          
          {/* --- SECRET EASTER EGG --- */}
          <SecretGame />

        </Providers>

      </body>
    </html>
  );
}