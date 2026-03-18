import Image from "next/image";
import Link from "next/link";
import Navbar from "../app/components/navbar"
import Hero from "../app/components/hero"
import TimeLine from "../app/components/timeline"
import Stats from "./components/stats";
import Footer from "./components/footer";
import BackgroundDots from "./components/backgroundDots";
export default function Home() {
  return (
    <>
      <BackgroundDots
        dotSize={1.8}
        dotColor="#cbcbcc"
        gap={15}
        fade={true}
      />

      <Navbar />
      <Hero />
      <TimeLine />
      <Footer />
    </>




  )
}
