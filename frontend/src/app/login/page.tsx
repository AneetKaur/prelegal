"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { login, register } from "@/lib/auth";

type Mode = "signin" | "register";

const FIELD_CLASS =
  "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

/** Sign in to an existing account, or register a new one. */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, name || null);
      } else {
        await login(email, password);
      }
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "signin" : "register");
    setError("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-md">
        <div className="mb-6">
          <span className="inline-block rounded-md bg-brand-navy px-2 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Prelegal
          </span>
          <h1 className="mt-4 text-xl font-semibold text-brand-navy">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isRegister
              ? "Register to start drafting and saving your agreements."
              : "Sign in to draft and revisit your agreements."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD_CLASS}
              placeholder="you@example.com"
            />
          </label>

          {isRegister && (
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Name <span className="font-normal text-slate-400">(optional)</span>
              <input
                type="text"
                value={name}
                autoComplete="name"
                onChange={(e) => setName(e.target.value)}
                className={FIELD_CLASS}
                placeholder="Your name"
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD_CLASS}
              placeholder={isRegister ? "At least 8 characters" : "Your password"}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting
              ? isRegister
                ? "Creating account…"
                : "Signing in…"
              : isRegister
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? "Already have an account?" : "New to Prelegal?"}{" "}
          <button
            type="button"
            onClick={switchMode}
            className="font-medium text-brand-purple hover:underline"
          >
            {isRegister ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </main>
  );
}
