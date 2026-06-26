"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("E-posta veya şifre hatalı.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-5 rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-8 shadow-xl"
    >
      <div>
        <h1 className="text-2xl font-bold text-ozmaksan-text">Giriş Yap</h1>
        <p className="mt-1 text-ozmaksan-muted">
          Özmaksan üretim takip sistemine erişin
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-semibold text-ozmaksan-text">
          E-posta
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-lg text-ozmaksan-text focus:border-ozmaksan-accent focus:outline-none"
          placeholder="admin@ozmaksan.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="font-semibold text-ozmaksan-text">
          Şifre
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg px-4 text-lg text-ozmaksan-text focus:border-ozmaksan-accent focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="h-16 rounded-xl bg-ozmaksan-red text-lg font-bold text-white hover:bg-ozmaksan-red-hover disabled:opacity-50"
      >
        {loading ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
    </form>
  );
}
