import Navbar from "./components/navbar";
import Hero from "./components/hero";
import TimeLine from "./components/timeline";
import Footer from "./components/footer";
import BackgroundDots from "./components/backgroundDots";
import Slider from "./components/slider";

export default function Home() {
  return (
    <>
      <Navbar />
      <BackgroundDots dotSize={1.8} dotColor="#cbcbcc" gap={15} fade={true} />
      <Hero />
      <Slider />
      <TimeLine />
      <Footer />
    </>
  );
}
