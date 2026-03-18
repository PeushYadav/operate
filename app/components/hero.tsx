import react from "react"
import Link from "next/link"
import Image from "next/image"
import Button from "../components/button"
import BackgroundDots from "./backgroundDots"
const hero = () => {
  return (
    <>
      <BackgroundDots
        dotSize={1.8}
        dotColor="#cbcbcc"
        gap={15}
        fade={true}
      />

      <div className="hero bg-transparent min-h-[100vh] text-black">
        <div className="hero-content flex-col lg:flex-row-reverse gap-x-20">
          <img
            src="/svgs/Hero.svg"
            alt="Hero Image Alt"
            className="w-full max-w-[500px] h-auto"
          />
          <div>
            <span className="text-5xl font">
              <span className="bg-yellow-400 text-black-800">Operate</span>— Linux, Built for Your
              <span className="text-rotate">
                <span>
                  <span className="bg-teal-400 text-black-800 px-2"> Development</span>
                  <span className="bg-red-400 text-black-800 px-2"> cybersecurity</span>
                  <span className="bg-blue-400 text-black-800 px-2"> productivity</span>
                  <span className="bg-violet-400 text-black-800 px-2"> Workflow</span>
                </span>
              </span>
            </span>
            <p className="py-6">
              With Operate, you describe what you need development, design, cybersecurity, AI, or everyday productivity and we build a custom Linux distribution optimized specifically for you.

              From pre-installed tools and system optimizations to interface design and performance tuning, Operate delivers an OS that works exactly the way you do.
            </p>
            <div className="flex justify-center items-center">
              <Button text="Lets Build! " href="/new" varient="primary" />
            </div>

          </div>
        </div>
      </div >
    </>

  )
}
export default hero
