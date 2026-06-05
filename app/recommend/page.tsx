import Navbar from "../components/navbar";
import RecommendClient from "./recommend-client";

export default function RecommendPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <RecommendClient />
    </div>
  );
}
