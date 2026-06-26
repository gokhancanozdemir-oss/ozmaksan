import AppHeader from "@/components/AppHeader";
import ProductionTrackerLoader from "@/components/ProductionTrackerLoader";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
      <AppHeader subtitle="Akıllı Depo & Üretim Takip" />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ozmaksan-blue-light sm:text-3xl">
            Sarfiyat & Stok Girişi
          </h2>
          <div className="mx-auto mt-3 h-0.5 w-16 bg-ozmaksan-red" />
          <p className="mt-4 text-base text-ozmaksan-muted sm:text-lg">
            QR kodu okutarak hammadde tüketimini veya stok girişini kaydedin
          </p>
        </div>

        <ProductionTrackerLoader />
      </main>

      <footer className="border-t border-ozmaksan-border bg-ozmaksan-surface px-4 py-5 text-center sm:px-8">
        <div className="mx-auto h-0.5 max-w-xs bg-ozmaksan-red" />
        <p className="mt-3 text-sm font-semibold text-ozmaksan-blue-light">
          YÜKSEK ISI TEKNOLOJİSİ
        </p>
        <p className="mt-1 text-xs text-ozmaksan-muted">
          ÖZMAKSAN ISI SANAYİ TİCARET A.Ş. · WMS & MES
        </p>
      </footer>
    </div>
  );
}
