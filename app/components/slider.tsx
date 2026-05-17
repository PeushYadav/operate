"use client";
import React from "react";
import Arch from "../../public/logos/Archlinux.png";
import Debian from "../../public/logos/Debian.png";
import Fedora from "../../public/logos/fedora.png";
import KaliLinux from "../../public/logos/Kalilinux.png";
import Mint from "../../public/logos/linuxmint.svg";
import Manjero from "../../public/logos/manjero.svg";
import Pop from "../../public/logos/Pop.png";
import Redhat from "../../public/logos/RedHat.svg";
import Ubuntu from "../../public/logos/Ubuntu.png";

const logos = [Arch, Debian, Fedora, KaliLinux, Mint, Manjero, Pop, Redhat, Ubuntu];
const names = ["", "", "", "", "", "Manjaro", "", "", "Ubuntu"];

const Slider: React.FC = () => {
  const doubled = [...logos, ...logos];
  const doubledNames = [...names, ...names];

  return (
    <section className="bg-zinc-950 py-12">

      {/* Section label */}
      <div className="flex items-center justify-center gap-4 mb-7 px-6">
        <div className="h-px flex-1 max-w-[80px] bg-zinc-800" />
        <span className="text-[11px] font-mono tracking-[0.12em] uppercase text-zinc-600">
          Built on top of
        </span>
        <div className="h-px flex-1 max-w-[80px] bg-zinc-800" />
      </div>

      {/* Track wrapper with fade masks */}
      <div className="relative overflow-hidden w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-28 z-10 bg-gradient-to-r from-zinc-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-28 z-10 bg-gradient-to-l from-zinc-950 to-transparent" />

        {/* Sliding track */}
        <div
          className="flex items-center gap-14 w-max"
          style={{ animation: "slide 22s linear infinite" }}
        >
          {doubled.map((logo, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-5 py-2 rounded-full border border-zinc-800 bg-zinc-900/60 select-none"
            >
              <img
                src={typeof logo === "string" ? logo : logo.src}
                alt={doubledNames[i]}
                draggable="false"
                className="h-5 w-auto opacity-60 pointer-events-none"
              />
              <span className="text-[13px] font-medium text-zinc-500 whitespace-nowrap">
                {doubledNames[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default Slider;
