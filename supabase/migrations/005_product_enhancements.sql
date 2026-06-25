-- Product category and low-stock threshold
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS min_stock_threshold NUMERIC DEFAULT 0 CHECK (min_stock_threshold IS NULL OR min_stock_threshold >= 0),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Sarfiyat kayıtlarına not alanı
ALTER TABLE public.consumption_records
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- İş emirleri tablosu
CREATE TABLE IF NOT EXISTS public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.profiles(id),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read work orders"
  ON public.work_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage work orders"
  ON public.work_orders FOR ALL
  TO authenticated
  USING (public.is_admin());
