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
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isAdmin = profile?.role === "admin";
  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");

  const adminLinkClass = adminActive
    ? "bg-ozmaksan-blue text-white"
    : "border-2 border-ozmaksan-border text-ozmaksan-text hover:border-ozmaksan-blue hover:text-ozmaksan-blue-light";

  return (
    <header className="border-b border-ozmaksan-border bg-ozmaksan-surface">
      <div className="h-1 bg-ozmaksan-red" />

      <div className="px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <OzmaksanLogo size="sm" />
            {subtitle && (
              <div className="hidden border-l-2 border-ozmaksan-red pl-4 sm:block">
                <p className="text-xs font-semibold uppercase tracking-widest text-ozmaksan-blue-light">
                  {subtitle}
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors sm:px-4 ${adminLinkClass}`}
              >
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Yönetim Paneli</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ozmaksan-border text-ozmaksan-text sm:hidden"
              aria-expanded={menuOpen}
              aria-label="Menü"
            >
              {menuOpen ? "✕" : "☰"}
            </button>

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
              className="hidden h-11 rounded-xl border-2 border-ozmaksan-border px-4 text-sm font-semibold text-ozmaksan-muted transition-colors hover:border-ozmaksan-red hover:text-ozmaksan-red sm:flex"
            >
              Çıkış
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="mx-auto mt-3 max-w-6xl rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-4 sm:hidden">
            {subtitle && (
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ozmaksan-blue-light">
                {subtitle}
              </p>
            )}
            {profile && (
              <div className="mb-3 border-b border-ozmaksan-border pb-3">
                <p className="font-semibold text-ozmaksan-text">
                  {profile.full_name || profile.email}
                </p>
                <p className="mt-1 text-xs font-bold uppercase text-ozmaksan-blue-light">
                  {profile.role === "admin" ? "Yönetici" : "Okutucu"}
                </p>
              </div>
            )}
            {isAdmin && pathname !== "/admin" && !pathname.startsWith("/admin/") && (
              <Link
                href="/admin"
                className="mb-2 flex h-12 w-full items-center justify-center rounded-xl bg-ozmaksan-blue text-sm font-semibold text-white"
              >
                Yönetim Paneli
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-12 w-full items-center justify-center rounded-xl border-2 border-ozmaksan-border text-sm font-semibold text-ozmaksan-muted"
            >
              Çıkış
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
