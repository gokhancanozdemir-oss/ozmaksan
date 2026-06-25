import type {
  ConsumptionData,
  ConsumptionRecord,
  ConsumptionResult,
  Product,
  Project,
  Unit,
} from "@/lib/types/database";
import { createClient } from "./client";

export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, customer, description, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchProductByQrCode(
  qrCode: string
): Promise<Product | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, qr_code, name, unit_cost, default_unit, stock_quantity")
    .eq("qr_code", qrCode)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveConsumption(
  input: Pick<ConsumptionData, "qrCode" | "projeId" | "miktar" | "birim">
): Promise<ConsumptionResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("record_consumption", {
    p_qr_code: input.qrCode,
    p_project_id: input.projeId,
    p_quantity: input.miktar,
    p_unit: input.birim,
  });

  if (error) throw new Error(error.message);
  return data as ConsumptionResult;
}

export const UNITS: Unit[] = ["kg", "m", "adet"];

// --- Admin API ---

export async function adminFetchAllProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, customer, description, is_active")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adminUpsertProject(
  project: Partial<Project> & { name: string }
): Promise<void> {
  const supabase = createClient();
  if (project.id) {
    const { error } = await supabase
      .from("projects")
      .update({
        name: project.name,
        customer: project.customer ?? null,
        description: project.description ?? null,
        is_active: project.is_active ?? true,
      })
      .eq("id", project.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("projects").insert({
      name: project.name,
      customer: project.customer ?? null,
      description: project.description ?? null,
      is_active: project.is_active ?? true,
    });
    if (error) throw new Error(error.message);
  }
}

export async function adminDeleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminFetchAllProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, qr_code, name, unit_cost, default_unit, stock_quantity")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function adminUpsertProduct(
  product: Partial<Product> & {
    qr_code: string;
    name: string;
    default_unit: Unit;
  }
): Promise<void> {
  const supabase = createClient();
  if (product.id) {
    const { error } = await supabase
      .from("products")
      .update({
        qr_code: product.qr_code,
        name: product.name,
        unit_cost: product.unit_cost ?? 0,
        default_unit: product.default_unit,
        stock_quantity: product.stock_quantity ?? 0,
      })
      .eq("id", product.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("products").insert({
      qr_code: product.qr_code,
      name: product.name,
      unit_cost: product.unit_cost ?? 0,
      default_unit: product.default_unit,
      stock_quantity: product.stock_quantity ?? 0,
    });
    if (error) throw new Error(error.message);
  }
}

export async function adminDeleteProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminFetchProjectById(
  id: string
): Promise<Project | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, customer, description, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminFetchConsumptionByProjectId(
  projectId: string
): Promise<ConsumptionRecord[]> {
  const supabase = createClient();
  const { data: records, error } = await supabase
    .from("consumption_records")
    .select(
      "id, product_id, project_id, user_id, quantity, unit, unit_cost, total_cost, created_at"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!records?.length) return [];

  const productIds = [...new Set(records.map((r) => r.product_id))];
  const userIds = [
    ...new Set(records.map((r) => r.user_id).filter(Boolean)),
  ] as string[];

  const [productsRes, profilesRes] = await Promise.all([
    supabase.from("products").select("id, name, qr_code").in("id", productIds),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const productMap = new Map(
    (productsRes.data ?? []).map((p) => [p.id, p])
  );
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );

  return records.map((r) => ({
    ...r,
    products: productMap.get(r.product_id) ?? null,
    profiles: r.user_id ? profileMap.get(r.user_id) ?? null : null,
  }));
}

export async function adminFetchConsumptionRecords(): Promise<
  ConsumptionRecord[]
> {
  const supabase = createClient();
  const { data: records, error } = await supabase
    .from("consumption_records")
    .select(
      "id, product_id, project_id, user_id, quantity, unit, unit_cost, total_cost, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  if (!records?.length) return [];

  const productIds = [...new Set(records.map((r) => r.product_id))];
  const projectIds = [...new Set(records.map((r) => r.project_id))];
  const userIds = [
    ...new Set(records.map((r) => r.user_id).filter(Boolean)),
  ] as string[];

  const [productsRes, projectsRes, profilesRes] = await Promise.all([
    supabase.from("products").select("id, name, qr_code").in("id", productIds),
    supabase.from("projects").select("id, name").in("id", projectIds),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const productMap = new Map(
    (productsRes.data ?? []).map((p) => [p.id, p])
  );
  const projectMap = new Map(
    (projectsRes.data ?? []).map((p) => [p.id, p])
  );
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );

  return records.map((r) => ({
    ...r,
    products: productMap.get(r.product_id) ?? null,
    projects: projectMap.get(r.project_id) ?? null,
    profiles: r.user_id ? profileMap.get(r.user_id) ?? null : null,
  }));
}
