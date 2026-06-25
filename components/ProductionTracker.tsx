"use client";

import { useCallback, useEffect, useState } from "react";
import ConsumptionForm from "./ConsumptionForm";
import QrScanner from "./QrScanner";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchProductByQrCode,
  fetchProjects,
  saveConsumption,
} from "@/lib/supabase/consumption";
import type { ConsumptionData, Product, Project } from "@/lib/types/database";

export default function ProductionTracker() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setProjectsLoading(false);
      setErrorMessage(
        "Supabase bağlantısı yapılandırılmamış. .env.local dosyasını oluşturun."
      );
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      try {
        const data = await fetchProjects();
        if (!cancelled) {
          setProjects(data);
          setErrorMessage(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Projeler yüklenemedi.";
          setErrorMessage(
            msg.includes("schema cache") || msg.includes("Could not find")
              ? "Veritabanı tabloları bulunamadı. Supabase SQL Editor'da supabase/setup.sql dosyasını çalıştırın."
              : msg
          );
        }
      } finally {
        if (!cancelled) setProjectsLoading(false);
      }
    }

    void loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!scannedCode || !isSupabaseConfigured()) {
      setProduct(null);
      return;
    }

    let cancelled = false;
    setProductLoading(true);
    setProduct(null);

    async function loadProduct() {
      try {
        const data = await fetchProductByQrCode(scannedCode!);
        if (!cancelled) {
          setProduct(data);
          setErrorMessage(null);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Ürün bilgisi alınamadı."
          );
        }
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    }

    void loadProduct();
    return () => {
      cancelled = true;
    };
  }, [scannedCode]);

  const handleScan = useCallback((decodedText: string) => {
    setSavedMessage(null);
    setErrorMessage(null);
    setScannedCode(decodedText);
  }, []);

  const handleCancel = useCallback(() => {
    setScannedCode(null);
    setProduct(null);
    setSavedMessage(null);
    setErrorMessage(null);
  }, []);

  const handleSave = useCallback(async (data: ConsumptionData) => {
    if (!isSupabaseConfigured()) {
      console.log("Sarfiyat kaydı (offline):", data);
      setSavedMessage(
        `${data.miktar} ${data.birim} — ${data.projeAdi} (yerel log)`
      );
      setScannedCode(null);
      setProduct(null);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const result = await saveConsumption({
        qrCode: data.qrCode,
        projeId: data.projeId,
        miktar: data.miktar,
        birim: data.birim,
        sacUsedEnMm: data.sacUsedEnMm,
        sacUsedBoyMm: data.sacUsedBoyMm,
      });

      console.log("Sarfiyat kaydı:", { ...data, result });

      setSavedMessage(
        `${data.miktar} ${data.birim} ${data.productName} — ${data.projeAdi} projesine kaydedildi. Maliyet: ${Number(result.total_cost).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}`
      );
      setScannedCode(null);
      setProduct(null);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Kayıt sırasında hata oluştu."
      );
    } finally {
      setIsSaving(false);
    }
  }, []);

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-8">
      {savedMessage && (
        <div className="w-full rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-5 py-4 text-center text-base text-emerald-300">
          {savedMessage}
        </div>
      )}

      {errorMessage && (
        <div className="w-full rounded-xl border border-red-500/40 bg-red-950/40 px-5 py-4 text-center text-base text-red-300">
          {errorMessage}
        </div>
      )}

      {scannedCode ? (
        <ConsumptionForm
          qrCode={scannedCode}
          product={product}
          productLoading={productLoading}
          projects={projects}
          projectsLoading={projectsLoading}
          isSaving={isSaving}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <QrScanner onScan={handleScan} />
      )}
    </div>
  );
}
