import type {
  ConsumptionData,
  ConsumptionRecord,
  ConsumptionResult,
  Product,
  Project,
  ProjectItem,
  Unit,
} from "@/lib/types/database";
import { createClient } from "./client";

const PRODUCT_SELECT =
  "id, qr_code, name, product_type, unit_cost, default_unit, stock_quantity, sac_en_mm, sac_boy_mm, sac_derinlik_mm, sac_adet, min_stock_threshold, is_active";

export async function fetchProjects(): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(
      "id, name, customer, description, is_active, order_number, order_year, status"
    )
    .eq("is_active", true)
    .order("order_year", { ascending: false })
    .order("order_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Project[];
}

export async function fetchProjectItems(
  projectId: string
): Promise<ProjectItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("project_items")
    .select(
      "id, project_id, sort_order, spec, product_name, quantity, status, order_delivery, factory_delivery, notes, destination"
    )
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as ProjectItem[];
}

export async function fetchProductByQrCode(
  qrCode: string
): Promise<Product | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("qr_code", qrCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function saveConsumption(
  input: Pick<
    ConsumptionData,
    | "qrCode"
    | "projeId"
    | "miktar"
    | "birim"
    | "sacUsedEnMm"
    | "sacUsedBoyMm"
    | "projectItemId"
  >
): Promise<ConsumptionResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("record_consumption", {
    p_qr_code: input.qrCode,
    p_project_id: input.projeId,
    p_quantity: input.miktar,
    p_unit: input.birim,
    p_sac_used_en_mm: input.sacUsedEnMm ?? null,
    p_sac_used_boy_mm: input.sacUsedBoyMm ?? null,
    p_project_item_id: input.projectItemId ?? null,
  });

  if (error) throw new Error(error.message);
  return data as ConsumptionResult;
}

export const UNITS: Unit[] = ["kg", "m", "adet"];

// --- Admin API ---

export async function adminFetchAllProjects(): Promise<Project[]> {
  const { adminFetchAllProjectsWithItems } = await import("./projects");
  return adminFetchAllProjectsWithItems();
}

export async function adminFetchAllProducts(
  includeInactive = false
): Promise<Product[]> {
  const supabase = createClient();
  let query = supabase.from("products").select(PRODUCT_SELECT).order("name");
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function buildProductRow(
  product: Partial<Product> & {
    qr_code: string;
    name: string;
    default_unit: Unit;
  }
) {
  const isSac = product.product_type === "sac";
  return {
    qr_code: product.qr_code,
    name: product.name,
    product_type: product.product_type ?? "standard",
    unit_cost: product.unit_cost ?? 0,
    default_unit: (isSac ? "kg" : product.default_unit) as Unit,
    stock_quantity: product.stock_quantity ?? 0,
    sac_en_mm: isSac ? product.sac_en_mm : null,
    sac_boy_mm: isSac ? product.sac_boy_mm : null,
    sac_derinlik_mm: isSac ? product.sac_derinlik_mm : null,
    sac_adet: isSac ? (product.sac_adet ?? 1) : null,
    min_stock_threshold:
      product.min_stock_threshold != null && product.min_stock_threshold > 0
        ? product.min_stock_threshold
        : null,
  };
}

export async function adminUpsertProduct(
  product: Partial<Product> & {
    qr_code: string;
    name: string;
    default_unit: Unit;
  }
): Promise<void> {
  const supabase = createClient();
  const row = buildProductRow(product);
  if (product.id) {
    const { error } = await supabase
      .from("products")
      .update(row)
      .eq("id", product.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("products").insert(row);
    if (error) throw new Error(error.message);
  }
}

export async function adminDeactivateProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminActivateProduct(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** @deprecated Use adminDeactivateProduct */
export async function adminDeleteProduct(id: string): Promise<void> {
  return adminDeactivateProduct(id);
}

export async function adminFetchProjectById(
  id: string
): Promise<Project | null> {
  const { adminFetchProjectWithItems } = await import("./projects");
  return adminFetchProjectWithItems(id);
}

export async function adminFetchConsumptionByProjectId(
  projectId: string
): Promise<ConsumptionRecord[]> {
  const supabase = createClient();
  const { data: records, error } = await supabase
    .from("consumption_records")
    .select(
      "id, product_id, project_id, project_item_id, user_id, quantity, unit, unit_cost, total_cost, created_at, sac_used_en_mm, sac_used_boy_mm"
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!records?.length) return [];

  const productIds = [...new Set(records.map((r) => r.product_id))];
  const itemIds = [
    ...new Set(
      records.map((r) => r.project_item_id).filter(Boolean)
    ),
  ] as string[];
  const userIds = [
    ...new Set(records.map((r) => r.user_id).filter(Boolean)),
  ] as string[];

  const [productsRes, itemsRes, profilesRes] = await Promise.all([
    supabase.from("products").select("id, name, qr_code").in("id", productIds),
    itemIds.length
      ? supabase
          .from("project_items")
          .select("id, spec, product_name")
          .in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const productMap = new Map(
    (productsRes.data ?? []).map((p) => [p.id, p])
  );
  const itemMap = new Map((itemsRes.data ?? []).map((i) => [i.id, i]));
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );

  return records.map((r) => ({
    ...r,
    products: productMap.get(r.product_id) ?? null,
    project_items: r.project_item_id
      ? itemMap.get(r.project_item_id) ?? null
      : null,
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
      "id, product_id, project_id, project_item_id, user_id, quantity, unit, unit_cost, total_cost, created_at, sac_used_en_mm, sac_used_boy_mm"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  if (!records?.length) return [];

  const productIds = [...new Set(records.map((r) => r.product_id))];
  const projectIds = [...new Set(records.map((r) => r.project_id))];
  const itemIds = [
    ...new Set(
      records.map((r) => r.project_item_id).filter(Boolean)
    ),
  ] as string[];
  const userIds = [
    ...new Set(records.map((r) => r.user_id).filter(Boolean)),
  ] as string[];

  const [productsRes, projectsRes, itemsRes, profilesRes] = await Promise.all([
    supabase.from("products").select("id, name, qr_code").in("id", productIds),
    supabase.from("projects").select("id, name").in("id", projectIds),
    itemIds.length
      ? supabase
          .from("project_items")
          .select("id, spec, product_name")
          .in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsRes.error) throw new Error(productsRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);
  if (itemsRes.error) throw new Error(itemsRes.error.message);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const productMap = new Map(
    (productsRes.data ?? []).map((p) => [p.id, p])
  );
  const projectMap = new Map(
    (projectsRes.data ?? []).map((p) => [p.id, p])
  );
  const itemMap = new Map((itemsRes.data ?? []).map((i) => [i.id, i]));
  const profileMap = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );

  return records.map((r) => ({
    ...r,
    products: productMap.get(r.product_id) ?? null,
    projects: projectMap.get(r.project_id) ?? null,
    project_items: r.project_item_id
      ? itemMap.get(r.project_item_id) ?? null
      : null,
    profiles: r.user_id ? profileMap.get(r.user_id) ?? null : null,
  }));
}

export async function adminDeleteConsumptionRecord(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc("delete_consumption_record", {
    p_record_id: id,
  });
  if (error) throw new Error(error.message);
}
