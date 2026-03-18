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
import BackgroundDots from "./backgroundDots";

const logos = [
  Arch,
  Debian,
  Fedora,
  KaliLinux,
  Mint,
  Manjero,
  Pop,
  Redhat,
  Ubuntu,
];

const Slider: React.FC = () => {
  return (
    <>

      <div className=" max-w-360 z-10 mx-auto overflow-hidden">

        {/* Slider Container */}
        <div className="overflow-hidden w-full">

          {/* Sliding Track */}
          <div
            className="flex items-center gap-16 w-max"
            style={{
              animation: "slide 20s linear infinite",
            }}
          >
            {logos.concat(logos).map((logo, index) => (
              <img
                key={index}
                src={typeof logo === "string" ? logo : logo.src}
                alt={`Logo ${index}`}
                draggable="false"
                className="h-12 w-auto select-none pointer-events-none"
              />
            ))}
          </div>
        </div>

        {/* 🔥 Keyframes injected directly (guaranteed to work) */}
        <style jsx>{`
        @keyframes slide {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
      </div>
    </>
  );
};

export default Slider;
