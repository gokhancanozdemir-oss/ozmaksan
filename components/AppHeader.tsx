"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isAdmin = profile?.role === "admin";

  const navLinks = [
    { href: "/", label: "Sarfiyat Girişi", show: true },
    { href: "/admin", label: "Yönetim Paneli", show: isAdmin },
  ];

  return (
    <header className="border-b border-ozmaksan-border bg-ozmaksan-surface shadow-md shadow-black/20">
      {/* Top bar - company tagline */}
      <div className="hidden border-b border-ozmaksan-border/50 bg-ozmaksan-bg/60 px-4 py-1.5 sm:block sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-xs tracking-widest text-ozmaksan-muted uppercase">
            ÖZMAKSAN ISI SANAYİ TİCARET A.Ş. · Yüksek Isı Teknolojisi
          </p>
          <div className="flex items-center gap-4 text-xs text-ozmaksan-muted">
            <span>📞 +90 342 220 40 56</span>
            <span>📍 4. OSB, Başpınar / GAZİANTEP</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          {/* Logo + Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-ozmaksan-bg ring-2 ring-ozmaksan-border group-hover:ring-ozmaksan-accent transition-all">
              <Image
                src="/ozmaksan-logo.svg"
                alt="ÖZMAKSAN Logo"
                fill
                className="object-contain p-1"
                priority
              />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-ozmaksan-text sm:text-2xl">
                ÖZMAKSAN
              </h1>
              <p className="text-xs font-medium uppercase tracking-widest text-ozmaksan-accent">
                {subtitle ?? "Akıllı Depo & Üretim Takip"}
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.filter((l) => l.show).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`h-10 rounded-xl px-4 text-sm font-semibold transition-colors flex items-center ${
                  pathname === link.href
                    ? "bg-ozmaksan-accent text-white"
                    : "text-ozmaksan-muted hover:bg-ozmaksan-surface-elevated hover:text-ozmaksan-text"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {profile && (
              <div className="hidden flex-col items-end md:flex">
                <span className="text-sm font-semibold text-ozmaksan-text">
                  {profile.full_name || profile.email}
                </span>
                <span className="rounded bg-ozmaksan-accent/20 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-ozmaksan-accent">
                  {profile.role === "admin" ? "Yönetici" : "Okutucu"}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="h-10 rounded-xl border-2 border-ozmaksan-border px-4 text-sm font-semibold text-ozmaksan-muted transition-colors hover:border-red-500/50 hover:bg-red-950/20 hover:text-red-400"
            >
              Çıkış
            </button>
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ozmaksan-border text-ozmaksan-muted hover:border-ozmaksan-accent hover:text-ozmaksan-text md:hidden"
              aria-label="Menü"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect y="3" width="18" height="2" rx="1" fill="currentColor" />
                <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
                <rect y="13" width="18" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="mx-auto mt-3 max-w-6xl border-t border-ozmaksan-border pt-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.filter((l) => l.show).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    pathname === link.href
                      ? "bg-ozmaksan-accent text-white"
                      : "text-ozmaksan-muted hover:bg-ozmaksan-surface-elevated hover:text-ozmaksan-text"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {profile && (
                <div className="mt-2 rounded-xl bg-ozmaksan-bg px-4 py-3 text-sm">
                  <p className="font-semibold text-ozmaksan-text">
                    {profile.full_name || profile.email}
                  </p>
                  <p className="text-ozmaksan-accent text-xs uppercase font-bold">
                    {profile.role === "admin" ? "Yönetici" : "Okutucu"}
                  </p>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
