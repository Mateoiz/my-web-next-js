import type { Metadata } from "next";
import Script from "next/script"; 
import "./globals.css";
import { Providers } from "./providers";
import { LoadingProvider } from "./context/LoadingContext";
import ClientLayout from "./components/ClientLayout";
import HolidayTheme from "./components/HolidayTheme";

export const metadata: Metadata = {
  title: "Junior Philippine Computer Society DLSAU",
  description: "The official student organization for Computer Science at De La Salle Araneta University. We empower the next generation of tech innovators.",
  
  // ✅ 1. ADDED: Icon Configuration
  // Make sure you put a file named 'logo.png' in your 'public' folder!
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png", // Optional: For iPhone/iPad home screen
  },

  openGraph: {
    title: "JPCS DLSAU",
    description: "The official student organization for Computer Science at De La Salle Araneta University.",
    images: [
      {
        url: "/og/og-image.jpg",
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
        
        {/* Google Analytics Scripts */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JK2XK3P10R"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-JK2XK3P10R');
          `}
        </Script>

        {/* Theme Providers */}
        <Providers>
          {/* Loading State Provider */}
          <LoadingProvider>
            {/* The Visual Layout */}
            <ClientLayout>
              {children}
            </ClientLayout>
          </LoadingProvider>
        </Providers>

      </body>
    </html>
  );
}