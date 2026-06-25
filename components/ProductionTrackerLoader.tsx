"use client";

import dynamic from "next/dynamic";

const ProductionTracker = dynamic(
  () => import("@/components/ProductionTracker"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <p className="text-lg text-ozmaksan-muted">Sistem yükleniyor…</p>
      </div>
    ),
  }
);

export default function ProductionTrackerLoader() {
  return <ProductionTracker />;
}
