"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch } from "@/lib/api";
import { buttonClass, inputClass, labelClass } from "@/lib/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/admin");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sign in failed");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-3xl font-medium">Admin sign in</h1>
      <p className="mt-2 text-sm text-stone-600">Staff access only. The session cookie is HTTP-only.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label><span className={labelClass}>Email</span><input className={inputClass} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label><span className={labelClass}>Password</span><input className={inputClass} type="password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error ? <p className="text-sm text-rose-800">{error}</p> : null}
        <button className={buttonClass} disabled={loading} type="submit">{loading ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
