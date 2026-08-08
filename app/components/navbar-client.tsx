"use client"
import React, { useState } from "react"
import Link from "next/link"
import type { Session } from "next-auth"
import { loginGoogle, logout } from "@/app/lib/auth/actions"

type Props = { session: Session | null }

const NavbarClient: React.FC<Props> = ({ session }) => {
  const [open, setOpen] = useState(false)
  const user = session?.user

  return (
    <div className="relative z-50 flex justify-center items-center py-4 w-full bg-zinc-950 ">
      <div className="relative w-[90%] max-w-6xl bg-zinc-900/85 backdrop-blur-md border border-zinc-700/80 rounded-full px-6 py-2.5 flex items-center justify-between">

        {/* Top amber accent line */}
        <div className="absolute top-0 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full" />

        {/* LEFT - LOGO */}
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-white font-['Syne',_sans-serif]"
        >
          Operate
        </Link>

        {/* CENTER - DESKTOP MENU */}
        <div className="hidden lg:flex gap-8">
          {["Help", "New", "Recommend"].map((item) => (
            <Link
              key={item}
              href={`/${item.toLowerCase()}`}
              className="text-[11px] font-mono tracking-widest uppercase text-zinc-400 hover:text-white transition-colors duration-150"
            >
              {item}
            </Link>
          ))}
        </div>

        {/* RIGHT - AUTH */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-[11px] font-mono tracking-widest uppercase text-zinc-400">
                {user.name ?? user.email}
              </span>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-1.5 rounded-full border border-zinc-700 text-zinc-400 text-sm hover:border-amber-400 hover:text-amber-400 hover:bg-amber-400/5 transition-all duration-150"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <form action={loginGoogle}>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-1.5 rounded-full border border-zinc-700 text-zinc-400 text-sm hover:border-amber-400 hover:text-amber-400 hover:bg-amber-400/5 transition-all duration-150"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Login
              </button>
            </form>
          )}
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          className="lg:hidden text-zinc-400 hover:text-white transition-colors"
          onClick={() => setOpen(!open)}
        >
          <svg className="h-5 w-5 " fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
          </svg>
        </button>

        {/* MOBILE DROPDOWN */}
        {open && (
          <div className="absolute top-[calc(100%+12px)] left-0 right-0 bg-zinc-900/97 backdrop-blur-md border border-zinc-700/80 rounded-2xl p-4 flex flex-col gap-1 lg:hidden z-50">
            {["Help", "New", "Recommend"].map((item) => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 rounded-lg text-[11px] font-mono tracking-widest uppercase text-zinc-400 hover:text-white hover:bg-white/4 transition-all duration-150"
              >
                {item}
              </Link>
            ))}
            {user ? (
              <form action={logout} className="mt-2">
                <button
                  type="submit"
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm text-left hover:border-amber-400 hover:text-amber-400 transition-all duration-150"
                >
                  Sign out ({user.name ?? user.email})
                </button>
              </form>
            ) : (
              <form action={loginGoogle} className="mt-2">
                <button
                  type="submit"
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm text-left hover:border-amber-400 hover:text-amber-400 transition-all duration-150"
                >
                  Login
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NavbarClient
