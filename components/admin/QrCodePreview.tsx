"use client";

import { useEffect, useState } from "react";
import { createLabeledQrDataUrl, downloadQrPng } from "@/lib/qr";

type QrCodePreviewProps = {
  value: string;
  productName?: string;
};

export default function QrCodePreview({ value, productName }: QrCodePreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const displayName = productName?.trim() || "Ürün";

  useEffect(() => {
    if (!value) {
      setDataUrl(null);
      return;
    }
    let cancelled = false;
    void createLabeledQrDataUrl({
      qrCode: value,
      productName: displayName,
      qrSize: 280,
    }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, displayName]);

  if (!value) return null;

  const filename = `etiket-${displayName.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg p-4 sm:col-span-2">
      <p className="text-sm font-medium text-ozmaksan-muted">
        Etiket Önizleme (yazdırılabilir)
      </p>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`${displayName} — ${value}`}
          className="max-h-80 rounded-lg border border-ozmaksan-border bg-white shadow-md"
        />
      ) : (
        <div className="flex h-48 w-56 items-center justify-center rounded-lg bg-ozmaksan-surface text-ozmaksan-muted">
          Oluşturuluyor…
        </div>
      )}
      <p className="text-center text-xs text-ozmaksan-muted">
        Üst: QR kodu · Orta: QR · Alt: ürün adı
      </p>
      <button
        type="button"
        onClick={() => void downloadQrPng(value, displayName, filename)}
        className="h-12 w-full rounded-xl border-2 border-ozmaksan-accent px-4 text-sm font-semibold text-ozmaksan-accent hover:bg-ozmaksan-accent hover:text-white"
      >
        Etiket PNG İndir
      </button>
    </div>
  );
}
