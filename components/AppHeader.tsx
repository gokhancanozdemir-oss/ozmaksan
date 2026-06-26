"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";
import OzmaksanLogo from "@/components/OzmaksanLogo";

type AppHeaderProps = {
  subtitle?: string;
};

export default function AppHeader({ subtitle }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const isAdmin = profile?.role === "admin";

  return (
    <header className="border-b border-ozmaksan-border bg-ozmaksan-surface">
      {/* Kırmızı marka çizgisi — logodaki alt çizgi */}
      <div className="h-1 bg-ozmaksan-red" />

      <div className="px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <OzmaksanLogo size="sm" />
            {subtitle && (
              <div className="hidden border-l-2 border-ozmaksan-red pl-4 sm:block">
                <p className="text-xs font-semibold uppercase tracking-widest text-ozmaksan-blue-light">
                  {subtitle}
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className={`hidden h-11 items-center rounded-xl px-4 text-sm font-semibold transition-colors sm:flex ${
                  pathname === "/admin"
                    ? "bg-ozmaksan-blue text-white"
                    : "border-2 border-ozmaksan-border text-ozmaksan-text hover:border-ozmaksan-blue hover:text-ozmaksan-blue-light"
                }`}
              >
                Yönetim Paneli
              </Link>
            )}
            {profile && (
              <span className="hidden text-sm text-ozmaksan-muted md:inline">
                {profile.full_name || profile.email}
                <span className="ml-2 rounded bg-ozmaksan-blue/20 px-2 py-0.5 text-xs font-bold uppercase text-ozmaksan-blue-light">
                  {profile.role === "admin" ? "Yönetici" : "Okutucu"}
                </span>
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="h-11 rounded-xl border-2 border-ozmaksan-border px-4 text-sm font-semibold text-ozmaksan-muted transition-colors hover:border-ozmaksan-red hover:text-ozmaksan-red"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
