import type { Metadata } from "next";
import Script from "next/script"; // 1. Import Script
import "./globals.css";
import { Providers } from "./providers";
import { LoadingProvider } from "./context/LoadingContext";
import ClientLayout from "./components/ClientLayout";
import HolidayTheme from "./components/HolidayTheme";

export const metadata: Metadata = {
  title: "Junior Philippine Computer Society DLSAU",
  description: "The official student organization for Computer Science at De La Salle Araneta University. We empower the next generation of tech innovators.",
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
        
        {/* 2. Google Analytics Scripts added here */}
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

        {/* 3. Theme Providers (Wrap everything) */}
        <Providers>
          

          {/* 4. Loading State Provider */}
          <LoadingProvider>
            
            {/* 5. The Visual Layout (Navbar, Footer, etc.) */}
            <ClientLayout>
              {children}
            </ClientLayout>
            
          </LoadingProvider>
        </Providers>

      </body>
    </html>
  );
}