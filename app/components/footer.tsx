"use client";
import React from "react";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800">
      {/* Top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="text-xl font-bold tracking-tight text-white font-['Syne',_sans-serif]">
            Operate
          </Link>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed max-w-xs">
            Custom Linux distributions built for your exact workflow. Pre-installed, pre-tuned, ready to run.
          </p>
          <div className="mt-5 flex gap-3">
            {["Dev-ready", "Open source"].map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase text-zinc-600">
                <span className="text-amber-500 text-xs">✦</span>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Services */}
        <nav>
          <h6 className="text-[11px] font-mono tracking-[0.12em] uppercase text-zinc-600 mb-4">
            Services
          </h6>
          <ul className="flex flex-col gap-2.5">
            {["Custom builds", "Recommendations", "Help & support", "Enterprise"].map((item) => (
              <li key={item}>
                <Link href="#" className="text-sm text-zinc-500 hover:text-amber-400 transition-colors duration-150">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Company */}
        <nav>
          <h6 className="text-[11px] font-mono tracking-[0.12em] uppercase text-zinc-600 mb-4">
            Company
          </h6>
          <ul className="flex flex-col gap-2.5">
            {["About us", "Contact", "Blog", "Press kit"].map((item) => (
              <li key={item}>
                <Link href="#" className="text-sm text-zinc-500 hover:text-amber-400 transition-colors duration-150">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal */}
        <nav>
          <h6 className="text-[11px] font-mono tracking-[0.12em] uppercase text-zinc-600 mb-4">
            Legal
          </h6>
          <ul className="flex flex-col gap-2.5">
            {["Terms of use", "Privacy policy", "Cookie policy"].map((item) => (
              <li key={item}>
                <Link href="#" className="text-sm text-zinc-500 hover:text-amber-400 transition-colors duration-150">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800 px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-zinc-700 tracking-wide">
          © {new Date().getFullYear()} Operate. All rights reserved.
        </p>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[11px] font-mono text-zinc-700 tracking-wide">
            Rolling release · Open source
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
