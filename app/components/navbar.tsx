"use client"
import react from "react"
import Link from "next/link"

const Navbar = () => {
  return (
    <>
      <div className="flex justify-center items-center py-4">
        <div className="navbar text-black z-10 bg-white border-solid rounded-full px-10 max-w-[90vw] shadow-md shadow-amber-300  ">
          <div className="navbar-start">
            <div className="dropdown">
              <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /> </svg>
              </div>
              <ul
                tabIndex={-1}
                className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
                <li><Link href="/help">Help</Link></li >
                <li><Link href="/new">New</Link></li >
                <li><Link href="/recommend">Recommend</Link></li >

              </ul>
            </div>
            <Link href="/" className="btn btn-ghost text-xl ">Operate</Link>
          </div>
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal px-1">
              <li><Link href="/help">Help</Link></li >
              <li><Link href="/new">New</Link></li >
              <li><Link href="/recommend">Recommend</Link></li >
            </ul>
          </div>
          <div className="navbar-end">
            <a className="btn border-solid rounded-full">Login</a>
          </div>
        </div >
      </div>

    </>
  )
}
export default Navbar
