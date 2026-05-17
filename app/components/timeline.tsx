"use client";
import React from "react";

const steps = [
  {
    step: "Step 1",
    title: "Tell us your needs",
    body: "Users describe what they want from their operating system — development tools, cybersecurity environments, AI frameworks, design software, gaming optimizations, or general productivity. This helps Operate understand the exact workflow the system needs to support.",
  },
  {
    step: "Step 2",
    title: "System configuration",
    body: "Based on the user's requirements, Operate selects the appropriate Linux base distribution, desktop environment, kernel optimizations, and software packages required for the workflow. This stage defines the architecture of the custom OS.",
  },
  {
    step: "Step 3",
    title: "Custom environment setup",
    body: "The selected tools, libraries, drivers, and configurations are integrated into the system. The user interface, performance settings, and workflow-specific applications are prepared to create a streamlined environment tailored for the user.",
  },
  {
    step: "Step 4",
    title: "Build the custom ISO",
    body: "Operate compiles the configured system into a bootable ISO image. The OS is packaged with all necessary tools, dependencies, and optimizations so the user receives a ready-to-use operating system environment.",
  },
  {
    step: "Step 5",
    title: "Download & use",
    body: "The user receives the custom ISO image and can boot it on their system or install it directly. From the first startup, the operating system is already configured for their workflow, providing a personalized and optimized computing environment.",
  },
];

const TimeLine = () => {
  return (
    <section className="bg-zinc-950 py-24 px-6">
      {/* Section label */}
      <div className="flex items-center justify-center gap-4 mb-16">
        <div className="h-px flex-1 max-w-[80px] bg-zinc-800" />
        <span className="text-[11px] font-mono tracking-[0.12em] uppercase text-zinc-600">
          How it works
        </span>
        <div className="h-px flex-1 max-w-[80px] bg-zinc-800" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        {/* Vertical line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-zinc-800 md:left-1/2" />

        <div className="flex flex-col gap-12">
          {steps.map((s, i) => {
            const isRight = i % 2 === 0;
            return (
              <div key={i} className="relative flex items-start gap-6 md:gap-0">
                {/* Dot */}
                <div className="relative z-10 flex-shrink-0 w-9 h-9 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center md:absolute md:left-1/2 md:-translate-x-1/2">
                  <span className="text-amber-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>

                {/* Content card */}
                <div
                  className={`
                    flex-1 md:w-[45%] md:flex-none
                    ${isRight
                      ? "md:mr-auto md:pr-12 md:text-right"
                      : "md:ml-auto md:pl-12 md:text-left"}
                  `}
                >
                  <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-900/60">
                    <span className="h-1 w-1 rounded-full bg-amber-400" />
                    <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2 font-['Syne',_sans-serif]">
                    {s.title}
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{s.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TimeLine;
