import Navbar from "../components/navbar";
import NewBuilder from "./new-builder";

export default function NewPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Navbar />
      <NewBuilder />
    </div>
  );
}
