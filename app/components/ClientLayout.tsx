"use client";

import Navbar from "./navbar";
import Footer from "./Footer";
import ThemeToggle from "./ThemeToggle";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="grow relative z-10">
        {children}
      </main>
      <Footer />
      <ThemeToggle />
    </div>
  );
}