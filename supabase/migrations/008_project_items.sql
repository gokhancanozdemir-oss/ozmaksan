-- Sipariş bazlı proje yapısı + kalemler (sip.xlsx modeli)

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS order_year INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'active', 'completed'));

-- Eski name unique kısıtını kaldır (sipariş no ile yönetilecek)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS projects_order_year_number_uidx
  ON public.projects (order_year, order_number)
  WHERE order_number IS NOT NULL AND order_year IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.project_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  spec TEXT,
  product_name TEXT NOT NULL,
  quantity NUMERIC CHECK (quantity IS NULL OR quantity > 0),
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'active', 'completed')),
  order_delivery TEXT,
  factory_delivery TEXT,
  notes TEXT,
  destination TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_items_project
  ON public.project_items(project_id, sort_order);

ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read project items"
  ON public.project_items FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage project items"
  ON public.project_items FOR ALL
  TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.project_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.project_items TO authenticated;
