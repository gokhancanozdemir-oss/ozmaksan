import type { Project, ProjectItem, ProjectItemStatus } from "@/lib/types/database";
import { deriveProjectStatus } from "@/lib/projectStatus";
import { createClient } from "./client";

const PROJECT_SELECT = `
  id, name, customer, description, is_active,
  order_number, order_year, status,
  project_items (
    id, project_id, sort_order, spec, product_name, quantity,
    status, order_delivery, factory_delivery, notes, destination
  )
`;

export type ProjectInput = {
  id?: string;
  order_number: string;
  order_year: number;
  customer: string;
  description?: string | null;
  items: Omit<ProjectItem, "id" | "project_id">[];
};

function buildProjectName(orderNumber: string, orderYear: number, customer: string) {
  return `Sip. ${orderNumber}/${orderYear} · ${customer}`;
}

function normalizeItems(
  items: ProjectInput["items"]
): Omit<ProjectItem, "id" | "project_id">[] {
  return items.map((item, index) => ({
    sort_order: item.sort_order ?? index,
    spec: item.spec ?? null,
    product_name: item.product_name.trim(),
    quantity: item.quantity ?? null,
    status: item.status ?? "not_started",
    order_delivery: item.order_delivery ?? null,
    factory_delivery: item.factory_delivery ?? null,
    notes: item.notes ?? null,
    destination: item.destination ?? null,
  }));
}

export async function adminFetchAllProjectsWithItems(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .order("order_year", { ascending: false })
    .order("order_number", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(normalizeProject);
}

export async function adminFetchProjectWithItems(
  id: string
): Promise<Project | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? normalizeProject(data) : null;
}

function normalizeProject(row: Record<string, unknown>): Project {
  const items = (row.project_items as ProjectItem[] | null) ?? [];
  items.sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id as string,
    name: row.name as string,
    customer: (row.customer as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    is_active: row.is_active as boolean | undefined,
    order_number: (row.order_number as string | null) ?? null,
    order_year: (row.order_year as number | null) ?? null,
    status: (row.status as ProjectItemStatus) ?? "not_started",
    items,
  };
}

export async function adminFindProjectByOrder(
  orderYear: number,
  orderNumber: string
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("order_year", orderYear)
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

export async function adminUpsertProjectWithItems(
  input: ProjectInput
): Promise<void> {
  const supabase = createClient();
  const items = normalizeItems(input.items);
  const status = deriveProjectStatus(items);
  const is_active = status !== "completed";
  const name = buildProjectName(
    input.order_number,
    input.order_year,
    input.customer
  );

  const projectRow = {
    name,
    customer: input.customer,
    description: input.description ?? null,
    order_number: input.order_number,
    order_year: input.order_year,
    status,
    is_active,
  };

  let projectId =
    input.id ??
    (await adminFindProjectByOrder(input.order_year, input.order_number));

  if (projectId) {
    const { error } = await supabase
      .from("projects")
      .update(projectRow)
      .eq("id", projectId);
    if (error) throw new Error(error.message);

    const { error: delErr } = await supabase
      .from("project_items")
      .delete()
      .eq("project_id", projectId);
    if (delErr) throw new Error(delErr.message);
  } else {
    const { data, error } = await supabase
      .from("projects")
      .insert(projectRow)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    projectId = data.id;
  }

  if (items.length > 0) {
    const { error } = await supabase.from("project_items").insert(
      items.map((item) => ({
        project_id: projectId,
        ...item,
      }))
    );
    if (error) throw new Error(error.message);
  }
}

export async function adminDeleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
