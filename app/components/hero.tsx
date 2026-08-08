"use client";

import Link from "next/link";
import BackgroundDots from "./backgroundDots";
import { useEffect, useState } from "react";

const ROTATING_WORDS = ["Development", "Cybersecurity", "Productivity", "Workflow"] as const;

const Hero = () => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
        setVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-zinc-950">
      {/* Background dots layer */}
      <div className="absolute inset-0 z-0 opacity-30">
        <BackgroundDots dotSize={1.5} dotColor="#52525b" gap={18} fade={true} />
      </div>

      {/* Subtle top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent z-10" />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-24">
        <div className="max-w-4xl w-full">

          {/* Eyebrow */}
          <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 font-mono mb-4">
            {"// Custom Linux Distros"}
          </p>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif leading-[1.05] text-white mb-8">
            <span className="block">Operate —</span>
            <span className="block text-zinc-400">Linux, built for</span>
            <span className="block">
              your{" "}
              <span
                className={`
                  inline-block italic text-zinc-400 transition-all duration-300
                  ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
                `}
              >
                {ROTATING_WORDS[index]}
              </span>
              <span className="italic text-zinc-400">.</span>
            </span>
          </h1>

          {/* Body copy */}
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-10">
            Tell us how you work. We hand you a Linux that already gets it —
            packages picked, environment ready on first boot. No three-day setup,
            no forum-diving.
            <span className="block mt-3 text-zinc-500">
              Starting with Arch + Hyprland. Ricing presets, more desktops, and
              bootloader choice landing next.
            </span>
          </p>

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/new"
              className="
                group inline-flex items-center gap-2
                px-6 py-3 rounded-md
                bg-amber-400 text-zinc-950
                font-semibold text-sm tracking-wide
                transition-all duration-200
                hover:bg-amber-300 hover:gap-3
                focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950
              "
            >
              Let&apos;s Build
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>

            <Link
              href="/recommend"
              className="
                inline-flex items-center gap-2
                px-6 py-3 rounded-md
                border border-zinc-700 text-zinc-300
                font-medium text-sm tracking-wide
                transition-all duration-200
                hover:border-zinc-500 hover:text-white
                focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950
              "
            >
              See recommendations
            </Link>
          </div>

          {/* Social proof strip */}
          {/* <div className="mt-16 flex flex-wrap items-center gap-6 text-zinc-600 text-xs font-mono">
            {["Dev-ready", "Air-gapped support", "Rolling release", "Open source"].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5">
                <span className="text-amber-500">✦</span>
                {tag}
              </span>
            ))}
          </div> */}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent z-10 pointer-events-none" />
    </section>
  );
};

export default Hero;

