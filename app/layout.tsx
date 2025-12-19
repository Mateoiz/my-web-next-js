import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { LoadingProvider } from "./context/LoadingContext";
import ClientLayout from "./components/ClientLayout";

export const metadata: Metadata = {
  title: "JPCS DLSAU",
  description: "The official student organization for Computer Science at De La Salle Araneta University. We empower the next generation of tech innovators.",
  openGraph: {
    title: "JPCS DLSAU",
    description: "The official student organization for Computer Science at De La Salle Araneta University.",
    images: [
      {
        url: "/og-image.jpg", // Fixed path (removed /public)
        width: 1200,
        height: 630,
        alt: "JPCS DLSAU Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "JPCS DLSAU",
    description: "The official student organization for Computer Science at De La Salle Araneta University.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-black text-zinc-900 dark:text-white transition-colors duration-300">
        
        {/* 1. Theme Providers */}
        <Providers>
          
          {/* 2. Loading State Provider */}
          <LoadingProvider>
            
            {/* 3. The Visual Layout (Navbar, Footer, etc.) */}
            <ClientLayout>
              {children}
            </ClientLayout>

          </LoadingProvider>
        </Providers>

      </body>
    </html>
  );
}