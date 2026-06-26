"use client";

import type { ProjectItemStatus } from "@/lib/types/database";
import {
  PROJECT_STATUS_LABELS,
  itemRowClass,
  projectRowClass,
} from "@/lib/projectStatus";

export function ProjectStatusBadge({ status }: { status: ProjectItemStatus }) {
  const styles: Record<ProjectItemStatus, string> = {
    not_started:
      "border-gray-500/50 bg-white/10 text-gray-300",
    active: "border-green-500/50 bg-green-600/25 text-green-200",
    completed: "border-yellow-500/50 bg-yellow-500/25 text-yellow-100",
  };

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

export function ProjectStatusLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ozmaksan-muted">
      <span className="flex items-center gap-2">
        <span className="h-3 w-8 rounded border border-gray-500/40 bg-white/10" />
        Başlanmadı
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-8 rounded border border-green-500/40 bg-green-600/25" />
        Aktif
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 w-8 rounded border border-yellow-500/40 bg-yellow-500/25" />
        Bitmiş
      </span>
    </div>
  );
}

export { projectRowClass, itemRowClass };
