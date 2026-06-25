-- Mevcut veritabanına müşteri alanı ekler (setup.sql zaten çalıştırıldıysa bunu çalıştırın)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS customer TEXT;

UPDATE public.projects SET customer = 'Özmaksan' WHERE name = 'Genel Üretim' AND customer IS NULL;
UPDATE public.projects SET customer = 'Mercedes Benz' WHERE name LIKE '%Mercedes%' AND customer IS NULL;
UPDATE public.projects SET customer = 'Aygaz' WHERE name LIKE '%Aygaz%' AND customer IS NULL;
UPDATE public.projects SET customer = 'Kalyon' WHERE name LIKE '%Kalyon%' AND customer IS NULL;
