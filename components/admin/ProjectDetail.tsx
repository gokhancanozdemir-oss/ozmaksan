"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  adminFetchConsumptionByProjectId,
  adminFetchProjectById,
} from "@/lib/supabase/consumption";
import type { ConsumptionRecord, Project } from "@/lib/types/database";
import { exportProjectToExcel } from "@/lib/export/projectExcel";
import AppHeader from "@/components/AppHeader";
import {
  ProjectStatusBadge,
  ProjectStatusLegend,
  itemRowClass,
} from "@/components/admin/ProjectStatusBadge";
import { formatProjectItemLabel, formatProjectLabel } from "@/lib/projectStatus";

type ProjectDetailProps = {
  projectId: string;
};

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [records, setRecords] = useState<ConsumptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, r] = await Promise.all([
        adminFetchProjectById(projectId),
        adminFetchConsumptionByProjectId(projectId),
      ]);
      if (!p) {
        setError("Proje bulunamadı.");
        return;
      }
      setProject(p);
      setRecords(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalCost = records.reduce((s, r) => s + Number(r.total_cost), 0);

  function handleExport() {
    if (!project) return;
    exportProjectToExcel(project, records);
  }

  if (loading) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
        <AppHeader subtitle="Proje Detayı" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 text-ozmaksan-muted sm:px-8">
          Yükleniyor…
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
        <AppHeader subtitle="Proje Detayı" />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-8">
          <p className="text-red-400">{error ?? "Proje bulunamadı."}</p>
          <Link
            href="/admin"
            className="mt-4 inline-block text-ozmaksan-accent hover:underline"
          >
            ← Yönetim paneline dön
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
      <AppHeader subtitle="Proje Detayı" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-block text-sm text-ozmaksan-muted hover:text-ozmaksan-accent"
            >
              ← Yönetim Paneli
            </Link>
            <h2 className="text-2xl font-bold text-ozmaksan-text">
              {formatProjectLabel(project)}
            </h2>
            <p className="mt-1 text-ozmaksan-muted">
              Sipariş kalemleri ve malzeme kullanım raporu
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex h-14 items-center gap-2 rounded-xl bg-emerald-700 px-6 text-base font-bold text-white shadow-lg hover:bg-emerald-600"
          >
            Excel İndir (.xlsx)
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Müşteri", value: project.customer ?? "—" },
            {
              label: "Durum",
              value: (
                <ProjectStatusBadge
                  status={project.status ?? "not_started"}
                />
              ),
            },
            { label: "Kalem Sayısı", value: String(project.items?.length ?? 0) },
            {
              label: "Toplam Maliyet",
              value: totalCost.toLocaleString("tr-TR", {
                style: "currency",
                currency: "TRY",
              }),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-surface-elevated p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-ozmaksan-muted">
                {card.label}
              </p>
              <p className="mt-1 text-lg font-bold text-ozmaksan-text">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {project.items && project.items.length > 0 && (
          <div className="mb-8 overflow-x-auto rounded-2xl border-2 border-ozmaksan-border">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ozmaksan-border bg-ozmaksan-surface px-4 py-3">
              <h3 className="font-bold text-ozmaksan-text">Sipariş Kalemleri</h3>
              <ProjectStatusLegend />
            </div>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-ozmaksan-surface text-ozmaksan-muted">
                <tr>
                  <th className="px-4 py-3">İmalat</th>
                  <th className="px-4 py-3">Cins</th>
                  <th className="px-4 py-3">Adet</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Sip. Teslim</th>
                  <th className="px-4 py-3">Fabr. Teslim</th>
                  <th className="px-4 py-3">ATÜ</th>
                </tr>
              </thead>
              <tbody>
                {project.items.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t border-ozmaksan-border ${itemRowClass(item.status)}`}
                  >
                    <td className="px-4 py-3">{item.spec || "—"}</td>
                    <td className="px-4 py-3 font-medium">{item.product_name}</td>
                    <td className="px-4 py-3">{item.quantity ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-ozmaksan-muted">
                      {item.order_delivery || "—"}
                    </td>
                    <td className="px-4 py-3 text-ozmaksan-muted">
                      {item.factory_delivery || "—"}
                    </td>
                    <td className="px-4 py-3">{item.destination || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {project.description && (
          <p className="mb-6 rounded-xl border border-ozmaksan-border bg-ozmaksan-surface px-4 py-3 text-ozmaksan-muted">
            {project.description}
          </p>
        )}

        <div className="overflow-hidden rounded-xl border-2 border-[#217346] shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between bg-[#217346] px-4 py-2">
            <span className="text-sm font-semibold text-white">
              Malzeme Kullanım Tablosu
            </span>
            <span className="font-mono text-xs text-white/80">
              {records.length} satır
            </span>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full min-w-[900px] border-collapse text-sm text-gray-900">
              <thead>
                <tr className="bg-[#E85D04] text-white">
                  {[
                    "Tarih",
                    "Kalem",
                    "Malzeme",
                    "QR Kod",
                    "Miktar",
                    "Birim",
                    "Birim Maliyet",
                    "Toplam",
                    "Personel",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border border-gray-300 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="border border-gray-200 px-4 py-12 text-center text-gray-500"
                    >
                      Bu projede henüz malzeme kullanımı kaydı yok
                    </td>
                  </tr>
                ) : (
                  records.map((r, i) => (
                    <tr
                      key={r.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="border border-gray-200 px-3 py-2 text-gray-600">
                        {new Date(r.created_at).toLocaleString("tr-TR")}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-700">
                        {r.project_items
                          ? formatProjectItemLabel(r.project_items)
                          : "—"}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 font-medium">
                        {r.products?.name ?? "—"}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 font-mono text-xs text-[#E85D04]">
                        {r.products?.qr_code ?? "—"}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right tabular-nums">
                        {r.quantity}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-center">
                        {r.unit}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right tabular-nums">
                        {Number(r.unit_cost).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-right font-semibold tabular-nums">
                        {Number(r.total_cost).toLocaleString("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        })}
                      </td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-600">
                        {r.profiles?.full_name || r.profiles?.email || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {records.length > 0 && (
                <tfoot>
                  <tr className="bg-[#3D5A80] font-bold text-white">
                    <td
                      colSpan={7}
                      className="border border-gray-400 px-3 py-3 text-right uppercase tracking-wide"
                    >
                      Genel Toplam
                    </td>
                    <td className="border border-gray-400 px-3 py-3 text-right tabular-nums">
                      {totalCost.toLocaleString("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      })}
                    </td>
                    <td className="border border-gray-400" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
