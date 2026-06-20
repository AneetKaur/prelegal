"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUser } from "@/lib/auth";

// Fake login screen (KAN-4): no authentication. Any email is accepted; we record
// the user via the backend and bring them into the platform.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || null }),
      });
      if (!resp.ok) throw new Error("Login failed");
      const body = await resp.json();
      setUser(body.user);
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold" style={{ color: "#032147" }}>
          Prelegal
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to start drafting your agreement.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Name <span className="font-normal text-slate-400">(optional)</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Your name"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60"
            style={{ backgroundColor: "#753991" }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
