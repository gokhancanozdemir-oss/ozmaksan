"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchDashboardStats,
  fetchLowStockProducts,
  fetchRecentActivity,
  fetchTopProductsByMonth,
  type DashboardStats,
  type LowStockProduct,
  type RecentRecord,
  type TopProduct,
} from "@/lib/supabase/dashboard";

function formatCurrency(val: number) {
  return val.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
  icon: string;
  accent?: boolean;
  warning?: boolean;
};

function KpiCard({ label, value, sub, icon, accent, warning }: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border-2 p-5 ${
        warning
          ? "border-amber-500/40 bg-amber-950/20"
          : accent
          ? "border-ozmaksan-accent/40 bg-ozmaksan-accent/10"
          : "border-ozmaksan-border bg-ozmaksan-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ozmaksan-muted truncate">
            {label}
          </p>
          <p
            className={`mt-1 text-3xl font-black ${
              warning
                ? "text-amber-300"
                : accent
                ? "text-ozmaksan-accent"
                : "text-ozmaksan-text"
            }`}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-ozmaksan-muted truncate">{sub}</p>
          )}
        </div>
        <span className="text-3xl shrink-0">{icon}</span>
      </div>
    </div>
  );
}

export default function DashboardPanel() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentRecord[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r, l, t] = await Promise.all([
        fetchDashboardStats(),
        fetchRecentActivity(8),
        fetchLowStockProducts(),
        fetchTopProductsByMonth(5),
      ]);
      setStats(s);
      setRecent(r);
      setLowStock(l);
      setTopProducts(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-ozmaksan-border border-t-ozmaksan-accent" />
          <p className="text-ozmaksan-muted">Veriler yükleniyor…</p>
        </div>
      </div>
    );
  }

  const maxCost = topProducts[0]?.total_cost ?? 1;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Low stock alert banner */}
      {(stats?.lowStockProducts ?? 0) + (stats?.zeroStockProducts ?? 0) > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-500/40 bg-amber-950/25 px-5 py-4">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="font-bold text-amber-300">Stok Uyarısı</p>
            <p className="text-sm text-amber-200/80">
              {stats?.zeroStockProducts} ürünün stoğu tükendi,{" "}
              {stats?.lowStockProducts} ürün minimum stok seviyesinin altında.{" "}
              <Link href="/admin" className="underline hover:text-amber-100">
                Yönetim Paneli&apos;nden inceleyin →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Aktif Proje"
          value={stats?.activeProjects ?? 0}
          sub="Devam eden projeler"
          icon="🏭"
          accent
        />
        <KpiCard
          label="Bugün Sarfiyat"
          value={stats?.todayRecords ?? 0}
          sub={formatCurrency(stats?.todayCost ?? 0)}
          icon="📦"
        />
        <KpiCard
          label="Bu Ay Maliyet"
          value={formatCurrency(stats?.monthCost ?? 0)}
          sub={`${stats?.monthRecords ?? 0} kayıt`}
          icon="💰"
          accent
        />
        <KpiCard
          label="Kritik Stok"
          value={(stats?.lowStockProducts ?? 0) + (stats?.zeroStockProducts ?? 0)}
          sub={`${stats?.zeroStockProducts ?? 0} ürün tükendi`}
          icon="🔴"
          warning={(stats?.zeroStockProducts ?? 0) > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <div className="rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface">
          <div className="flex items-center justify-between border-b border-ozmaksan-border px-5 py-4">
            <h3 className="font-bold text-ozmaksan-text">Son Sarfiyatlar</h3>
            <span className="text-xs text-ozmaksan-muted">Son 8 kayıt</span>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ozmaksan-muted">
              Henüz sarfiyat kaydı yok.
            </p>
          ) : (
            <ul className="divide-y divide-ozmaksan-border/60">
              {recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ozmaksan-text">
                      {r.product_name}
                    </p>
                    <p className="truncate text-xs text-ozmaksan-muted">
                      {r.project_name} · {r.quantity} {r.unit}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-ozmaksan-accent">
                      {formatCurrency(r.total_cost)}
                    </p>
                    <p className="text-xs text-ozmaksan-muted">{timeAgo(r.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Top products this month */}
          <div className="rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface">
            <div className="flex items-center justify-between border-b border-ozmaksan-border px-5 py-4">
              <h3 className="font-bold text-ozmaksan-text">Bu Ay En Çok Kullanılan</h3>
              <span className="text-xs text-ozmaksan-muted">Maliyet bazlı</span>
            </div>
            {topProducts.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-ozmaksan-muted">
                Bu ay henüz sarfiyat yok.
              </p>
            ) : (
              <ul className="divide-y divide-ozmaksan-border/60">
                {topProducts.map((p) => {
                  const pct = Math.round((p.total_cost / maxCost) * 100);
                  return (
                    <li key={p.product_id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="truncate text-sm font-semibold text-ozmaksan-text">
                          {p.product_name}
                        </p>
                        <p className="shrink-0 text-sm font-bold text-ozmaksan-accent">
                          {formatCurrency(p.total_cost)}
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-ozmaksan-bg">
                        <div
                          className="h-full rounded-full bg-ozmaksan-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Low stock list */}
          {lowStock.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-500/30 bg-amber-950/15">
              <div className="border-b border-amber-500/20 px-5 py-4">
                <h3 className="font-bold text-amber-300">Düşük Stok Uyarıları</h3>
              </div>
              <ul className="divide-y divide-amber-500/10">
                {lowStock.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 px-5 py-3">
                    <p className="truncate text-sm font-semibold text-ozmaksan-text">
                      {p.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                        p.stock_quantity <= 0
                          ? "bg-red-950/50 text-red-400"
                          : "bg-amber-950/50 text-amber-300"
                      }`}
                    >
                      {p.stock_quantity <= 0
                        ? "Tükendi"
                        : `${p.stock_quantity} ${p.default_unit}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
