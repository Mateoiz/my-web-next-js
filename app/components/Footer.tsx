"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FaFacebook, FaInstagram, FaYoutube } from "react-icons/fa";

// Org founding date — drives the live uptime readout below.
const FOUNDED_AT = new Date("2020-08-01T00:00:00Z").getTime();

const NAV_LINKS = [
  { label: "home", href: "/" },
  { label: "about", href: "/About" },
  { label: "events", href: "/Events" },
  { label: "blogs", href: "/Blogs" },
  { label: "officers", href: "/Officers" },
  { label: "contact", href: "/Contact" },
];

const SOCIAL_LINKS = [
  { icon: FaFacebook, label: "facebook", href: "https://www.facebook.com/JPCSDLSAU" },
  { icon: FaInstagram, label: "instagram", href: "https://www.instagram.com/jpcs_dlsau?igsh=YXo5emdqNTNpaDd6" },
  { icon: FaYoutube, label: "youtube", href: "https://youtube.com" },
];

function formatUptime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function UptimeReadout() {
  // Deterministic on first render (server + client) — actual ticking
  // only starts client-side inside useEffect, avoiding hydration drift.
  const [uptime, setUptime] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setUptime(formatUptime(Date.now() - FOUNDED_AT));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono text-zinc-500 tabular-nums">
      {uptime ?? "—d --:--:--"}
    </span>
  );
}

export default function Footer() {
  const pathname = usePathname();

  if (pathname && pathname.includes("/dashboard")) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 bg-black text-zinc-400 mt-auto border-t border-green-500/20 overflow-hidden font-sans">
      {/* Top hairline glow, consistent with the rest of the site's cyber border treatment */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/60 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-12 md:gap-8">

          {/* ── Identity block, styled as a terminal whoami card ── */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Image src="/Logo.png" alt="JPCS DLSAU logo" width={36} height={36} className="h-9 w-auto" />
              <span className="font-mono text-sm font-bold text-green-500 tracking-widest">
                &lt;jpcs/&gt;
              </span>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 font-mono text-xs leading-relaxed">
              <p className="text-zinc-600">$ whoami</p>
              <p className="text-green-500 mb-2">jpcs_dlsau</p>
              <p className="text-zinc-500">
                Junior Philippine Computer Society — De La Salle Araneta University chapter. Empowering the next generation of tech innovators.
              </p>
            </div>
          </div>

          {/* ── Nav, styled as a directory listing ── */}
          <div>
            <p className="font-mono text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
              /sitemap
            </p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group font-mono text-sm text-zinc-400 hover:text-green-400 transition-colors inline-flex items-center gap-2"
                  >
                    <span className="text-green-600 group-hover:text-green-400 transition-colors">&gt;</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Contact + socials, styled as connection ports ── */}
          <div>
            <p className="font-mono text-[11px] font-bold text-zinc-600 uppercase tracking-widest mb-4">
              /connect
            </p>
            <div className="space-y-2.5 mb-6 font-mono text-sm">
              <a
                href="mailto:jpcs.dlsau@gmail.com"
                className="block text-zinc-400 hover:text-green-400 transition-colors truncate"
              >
                jpcs.dlsau@gmail.com
              </a>
              <p className="text-zinc-500">Salvador Araneta Campus, 303 Victoneta Ave, Potrero, Malabon, 1475 Metro Manila</p>
            </div>
            <div className="flex gap-2">
              {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg border border-zinc-800 bg-zinc-950/60 text-zinc-500 flex items-center justify-center hover:text-green-400 hover:border-green-500/50 transition-colors"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom status bar — mirrors the BootScreen line styling ── */}
      <div className="relative border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-zinc-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            SYSTEM STATUS: <span className="text-green-500 font-bold">ONLINE</span>
            <span className="text-zinc-700 mx-1">·</span>
            UPTIME: <UptimeReadout />
          </div>
          <p className="text-zinc-600">
            &copy; {currentYear} Junior Philippine Computer Society DLSAU. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}