"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

type AppHeaderProps = {
  subtitle?: string;
};

export default function AppHeader({ subtitle }: AppHeaderProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (data) setProfile(data);
    }

    void loadProfile();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-ozmaksan-border bg-ozmaksan-surface px-4 py-5 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ozmaksan-accent font-bold text-white">
            Ö
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ozmaksan-text sm:text-2xl">
              ÖZMAKSAN
            </h1>
            <p className="text-xs font-medium uppercase tracking-widest text-ozmaksan-muted sm:text-sm">
              {subtitle ?? "Akıllı Depo & Üretim Takip"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden h-12 items-center rounded-xl border-2 border-ozmaksan-border px-4 text-sm font-semibold text-ozmaksan-text hover:border-ozmaksan-accent sm:flex"
            >
              Yönetim Paneli
            </Link>
          )}
          {profile && (
            <span className="hidden text-sm text-ozmaksan-muted md:inline">
              {profile.full_name || profile.email}
              <span className="ml-2 rounded bg-ozmaksan-bg px-2 py-0.5 text-xs uppercase text-ozmaksan-accent">
                {profile.role}
              </span>
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="h-12 rounded-xl border-2 border-ozmaksan-border px-4 text-sm font-semibold text-ozmaksan-muted hover:border-ozmaksan-steel hover:text-ozmaksan-text"
          >
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}
