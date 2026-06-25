import { createClient } from "./client";

export type DashboardStats = {
  activeProjects: number;
  totalProducts: number;
  lowStockProducts: number;
  zeroStockProducts: number;
  todayRecords: number;
  todayCost: number;
  monthCost: number;
  monthRecords: number;
};

export type RecentRecord = {
  id: string;
  created_at: string;
  quantity: number;
  unit: string;
  total_cost: number;
  product_name: string;
  project_name: string;
};

export type LowStockProduct = {
  id: string;
  name: string;
  stock_quantity: number;
  default_unit: string;
  min_stock_threshold: number | null;
  product_type: string;
};

export type TopProduct = {
  product_id: string;
  product_name: string;
  total_cost: number;
  total_quantity: number;
  unit: string;
  record_count: number;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = createClient();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [projectsRes, productsRes, todayRes, monthRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    supabase
      .from("products")
      .select("id, stock_quantity, min_stock_threshold"),
    supabase
      .from("consumption_records")
      .select("total_cost")
      .gte("created_at", todayStart),
    supabase
      .from("consumption_records")
      .select("total_cost")
      .gte("created_at", monthStart),
  ]);

  const products = productsRes.data ?? [];
  const lowStockProducts = products.filter((p) => {
    const threshold = p.min_stock_threshold ?? 0;
    return threshold > 0 && Number(p.stock_quantity) <= threshold;
  }).length;
  const zeroStockProducts = products.filter(
    (p) => Number(p.stock_quantity) <= 0
  ).length;

  const todayRecords = todayRes.data ?? [];
  const monthRecords = monthRes.data ?? [];

  return {
    activeProjects: projectsRes.count ?? 0,
    totalProducts: products.length,
    lowStockProducts,
    zeroStockProducts,
    todayRecords: todayRecords.length,
    todayCost: todayRecords.reduce((s, r) => s + Number(r.total_cost), 0),
    monthCost: monthRecords.reduce((s, r) => s + Number(r.total_cost), 0),
    monthRecords: monthRecords.length,
  };
}

export async function fetchRecentActivity(limit = 8): Promise<RecentRecord[]> {
  const supabase = createClient();

  const { data: records, error } = await supabase
    .from("consumption_records")
    .select("id, created_at, quantity, unit, total_cost, product_id, project_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !records?.length) return [];

  const productIds = [...new Set(records.map((r) => r.product_id))];
  const projectIds = [...new Set(records.map((r) => r.project_id))];

  const [productsRes, projectsRes] = await Promise.all([
    supabase.from("products").select("id, name").in("id", productIds),
    supabase.from("projects").select("id, name").in("id", projectIds),
  ]);

  const productMap = new Map((productsRes.data ?? []).map((p) => [p.id, p.name]));
  const projectMap = new Map((projectsRes.data ?? []).map((p) => [p.id, p.name]));

  return records.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    quantity: Number(r.quantity),
    unit: r.unit,
    total_cost: Number(r.total_cost),
    product_name: productMap.get(r.product_id) ?? "—",
    project_name: projectMap.get(r.project_id) ?? "—",
  }));
}

export async function fetchLowStockProducts(): Promise<LowStockProduct[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock_quantity, default_unit, min_stock_threshold, product_type")
    .order("stock_quantity", { ascending: true })
    .limit(10);

  if (error) return [];

  return (data ?? [])
    .filter((p) => {
      const threshold = p.min_stock_threshold ?? 0;
      return Number(p.stock_quantity) <= Math.max(threshold, 0) + 0.001;
    })
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock_quantity: Number(p.stock_quantity),
      default_unit: p.default_unit,
      min_stock_threshold: p.min_stock_threshold ? Number(p.min_stock_threshold) : null,
      product_type: p.product_type,
    }));
}

export async function fetchTopProductsByMonth(limit = 5): Promise<TopProduct[]> {
  const supabase = createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: records, error } = await supabase
    .from("consumption_records")
    .select("product_id, quantity, unit, total_cost")
    .gte("created_at", monthStart);

  if (error || !records?.length) return [];

  const map = new Map<string, { total_cost: number; total_quantity: number; unit: string; count: number }>();
  for (const r of records) {
    const existing = map.get(r.product_id);
    if (existing) {
      existing.total_cost += Number(r.total_cost);
      existing.total_quantity += Number(r.quantity);
      existing.count += 1;
    } else {
      map.set(r.product_id, {
        total_cost: Number(r.total_cost),
        total_quantity: Number(r.quantity),
        unit: r.unit,
        count: 1,
      });
    }
  }

  const sorted = [...map.entries()]
    .sort((a, b) => b[1].total_cost - a[1].total_cost)
    .slice(0, limit);

  if (!sorted.length) return [];

  const productIds = sorted.map(([id]) => id);
  const { data: products } = await supabase
    .from("products")
    .select("id, name")
    .in("id", productIds);

  const productMap = new Map((products ?? []).map((p) => [p.id, p.name]));

  return sorted.map(([id, stats]) => ({
    product_id: id,
    product_name: productMap.get(id) ?? "—",
    total_cost: stats.total_cost,
    total_quantity: stats.total_quantity,
    unit: stats.unit,
    record_count: stats.count,
  }));
}
