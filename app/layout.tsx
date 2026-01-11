import type { Metadata } from "next";
import Script from "next/script"; 
import "./globals.css";
import { Providers } from "./providers";
import { LoadingProvider } from "./context/LoadingContext";
import ClientLayout from "./components/ClientLayout";
// import HolidayTheme from "./components/HolidayTheme"; // (Uncomment if needed)

export const metadata: Metadata = {
  // 1. UPDATED: Title Template
  // This allows child pages to have titles like "About | JPCS DLSAU"
  title: {
    default: "JPCS - Junior Philippine Computer Society DLSAU",
    template: "%s | JPCS DLSAU",
  },
  
  description: "The official student organization for Computer Science at De La Salle Araneta University. We empower the next generation of tech innovators.",
  
  // 2. NEW: Keywords Strategy
  // These are the exact terms Google looks for to connect "JPCS" to your specific site.
  keywords: [
    "JPCS", 
    "Junior Philippine Computer Society", 
    "JPCS DLSAU", 
    "DLSAU", 
    "De La Salle Araneta University", 
    "Computer Science Organization", 
    "Student Organization Philippines",
    "IT Organization"
  ],

  // 3. NEW: Robots & Base URL
  // Explicitly tell Google it is allowed to read your site
  robots: {
    index: true,
    follow: true,
  },
  // Replace this with your actual deployed domain (e.g., https://jpcs-dlsau.vercel.app)
  // This fixes issues where social media images don't load
  metadataBase: new URL('https://jpcs-dlsau.com'), 

  // 4. NEW: Verification (For Google Search Console)
  // When you set up Search Console, they give you a code. Paste it here.
  verification: {
    google: "google-site-verification-code-goes-here", 
  },

  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png", 
  },

  openGraph: {
    title: "JPCS DLSAU",
    description: "The official student organization for Computer Science at De La Salle Araneta University.",
    siteName: "JPCS DLSAU",
    locale: "en_PH", // Tells Google this is relevant to the Philippines
    type: "website",
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