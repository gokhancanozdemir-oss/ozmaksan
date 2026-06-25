"use client";

import dynamic from "next/dynamic";

const DashboardPanel = dynamic(() => import("@/components/DashboardPanel"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-2xl border-2 border-ozmaksan-border bg-ozmaksan-surface"
        />
      ))}
    </div>
  ),
});

export default function DashboardPanelLoader() {
  return <DashboardPanel />;
}
