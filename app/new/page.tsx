"use client";

import { useState } from "react";
import Navbar from "../components/navbar";

const NewDist = () => {
  const [form, setForm] = useState({
    purpose: "",
    experience: "",
    ram: "",
    gpu: false,
    ui: "",
  });

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        body: JSON.stringify(form),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <>
      <Navbar />

      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-6">

        {/* FORM */}
        <div className="p-6 bg-zinc-900 rounded-xl w-full max-w-md space-y-4 shadow-lg">
          <h1 className="text-2xl font-bold text-center">
            Build Your Custom OS
          </h1>

          <input
            className="w-full p-2 bg-zinc-800 rounded"
            placeholder="Purpose (gaming/dev/general)"
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
          />

          <select
            className="w-full p-2 bg-zinc-800 rounded"
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
          >
            <option value="">Experience Level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <input
            className="w-full p-2 bg-zinc-800 rounded"
            placeholder="RAM (GB)"
            onChange={(e) => setForm({ ...form, ram: e.target.value })}
          />

          <input
            className="w-full p-2 bg-zinc-800 rounded"
            placeholder="UI (gnome/kde/i3)"
            onChange={(e) => setForm({ ...form, ui: e.target.value })}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              onChange={(e) => setForm({ ...form, gpu: e.target.checked })}
            />
            GPU Required
          </label>

          <button
            onClick={handleSubmit}
            className="w-full bg-white text-black p-2 rounded font-semibold hover:opacity-90"
          >
            {loading ? "Generating..." : "Generate ISO Config"}
          </button>
        </div>

        {/* RESULT */}
        {result && (
          <div className="mt-8 w-full max-w-md bg-zinc-900 p-4 rounded-xl shadow-lg">
            <h2 className="text-lg font-bold mb-2">Recommendation</h2>

            <p className="text-sm">
              <b>Template:</b> {result.selected_template || "N/A"}
            </p>

            <p className="text-sm mb-2">
              <b>Reason:</b> {result.reason || "N/A"}
            </p>

            <pre className="text-xs bg-black p-3 rounded overflow-x-auto">
              {JSON.stringify(result.config, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </>
  );
};

export default NewDist;
