"use client";

import { useEffect, useRef, useState } from "react";

type QrScannerProps = {
  onScan: (decodedText: string) => void;
};

export default function QrScanner({ onScan }: QrScannerProps) {
  const scannerRef = useRef<InstanceType<
    typeof import("html5-qrcode").Html5Qrcode
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (!isMounted) return;
            void scanner.stop().then(() => {
              scanner.clear();
              onScan(decodedText);
            });
          },
          () => {}
        );

        if (isMounted) {
          setIsStarting(false);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setIsStarting(false);
          setError(
            "Kamera açılamadı. Tarayıcı izinlerini kontrol edin veya HTTPS kullanın."
          );
        }
      }
    }

    void startScanner();

    return () => {
      isMounted = false;
      const scanner = scannerRef.current;
      if (scanner?.isScanning) {
        void scanner.stop().then(() => scanner.clear());
      }
    };
  }, [onScan]);

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div
        id="qr-reader"
        className="w-full max-w-md overflow-hidden rounded-xl border-2 border-ozmaksan-border bg-black shadow-lg shadow-black/40"
      />

      {isStarting && (
        <p className="text-lg text-ozmaksan-muted">Kamera başlatılıyor…</p>
      )}

      {error && (
        <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-red-950/40 px-5 py-4 text-center text-base text-red-300">
          {error}
        </div>
      )}

      <p className="max-w-md text-center text-base text-ozmaksan-muted">
        Hammadde etiketindeki QR kodu kameraya hizalayın
      </p>
    </div>
  );
}
