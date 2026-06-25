-- Sac levha adedi
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sac_adet NUMERIC DEFAULT 1 CHECK (sac_adet IS NULL OR sac_adet > 0);

UPDATE public.products
SET sac_adet = 1
WHERE product_type = 'sac' AND (sac_adet IS NULL OR sac_adet <= 0);
