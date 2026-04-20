import type { Metadata } from "next";
import Script from "next/script"; 
import "./globals.css";
import { Providers } from "./providers";
import { LoadingProvider } from "./context/LoadingContext";
import ClientLayout from "./components/ClientLayout";
import { AuthProvider } from "./context/AuthContext";

export const metadata: Metadata = {
  // Put the target keyword (JPCS) first, followed by the full name and university
  title: "JPCS | Junior Philippine Computer Society - DLSAU",
  description: "The official Junior Philippine Computer Society (JPCS) student organization at De La Salle Araneta University. We empower the next generation of tech innovators.",
  
  // Add search keywords (Google relies less on this now, but other search engines still check it)
  keywords: ["JPCS", "JPCS DLSAU", "Junior Philippine Computer Society", "De La Salle Araneta University CS", "Computer Science DLSAU"],
  
  // ... keep your icons and openGraph stuff exactly as they are
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png", 
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
        
        {/* Google Analytics Scripts (Safely outside the React Context tree) */}
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

        {/* App State & UI Providers */}
        <AuthProvider>
          <Providers>
            <LoadingProvider>
              <ClientLayout>
                {children}
              </ClientLayout>
            </LoadingProvider>
          </Providers>
        </AuthProvider>

      </body>
    </html>
  );
}