import type { ProjectItemStatus } from "@/lib/types/database";

/** Excel hücre renginden kalem durumu */
export function excelColorToStatus(fill: string | null | undefined): ProjectItemStatus {
  if (!fill) return "not_started";
  const upper = fill.toUpperCase();
  if (upper === "FFFF00") return "completed";
  if (upper === "92D050" || upper === "00B0F0") return "active";
  return "not_started";
}

export function deriveProjectStatus(
  items: { status: ProjectItemStatus }[]
): ProjectItemStatus {
  if (!items.length) return "not_started";
  if (items.every((i) => i.status === "completed")) return "completed";
  if (items.some((i) => i.status === "active")) return "active";
  if (items.some((i) => i.status === "not_started")) return "not_started";
  return "completed";
}

export const PROJECT_STATUS_LABELS: Record<ProjectItemStatus, string> = {
  not_started: "Başlanmadı",
  active: "Aktif",
  completed: "Bitmiş",
};

export function projectRowClass(status: ProjectItemStatus): string {
  switch (status) {
    case "completed":
      return "bg-yellow-500/15";
    case "active":
      return "bg-green-600/15";
    default:
      return "";
  }
}

export function itemRowClass(status: ProjectItemStatus): string {
  switch (status) {
    case "completed":
      return "bg-yellow-400/20";
    case "active":
      return "bg-green-500/20";
    default:
      return "bg-white/5";
  }
}

export function formatProjectLabel(project: {
  order_number?: string | null;
  order_year?: number | null;
  customer?: string | null;
  name: string;
}): string {
  if (project.order_number && project.order_year) {
    const cust = project.customer ? ` · ${project.customer}` : "";
    return `Sip. ${project.order_number}/${project.order_year}${cust}`;
  }
  return project.name;
}

export function formatProjectItemLabel(item: {
  spec?: string | null;
  product_name: string;
  quantity?: number | null;
}): string {
  const parts: string[] = [];
  if (item.spec?.trim()) parts.push(item.spec.trim());
  parts.push(item.product_name);
  if (item.quantity != null) parts.push(`${item.quantity} adet`);
  return parts.join(" · ");
}
