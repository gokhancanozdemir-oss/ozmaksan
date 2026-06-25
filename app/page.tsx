import AppHeader from "@/components/AppHeader";
import ProductionTrackerLoader from "@/components/ProductionTrackerLoader";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
      <AppHeader />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
        <div className="mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-ozmaksan-text sm:text-3xl">
            Sarfiyat Girişi
          </h2>
          <p className="mt-2 text-base text-ozmaksan-muted sm:text-lg">
            QR kodu okutarak hammadde tüketimini proje bazında kaydedin
          </p>
        </div>

        <ProductionTrackerLoader />
      </main>

      <footer className="border-t border-ozmaksan-border px-4 py-4 text-center text-sm text-ozmaksan-muted">
        Yüksek Isı Teknolojisi · WMS & MES Hibrit Sistemi
      </footer>
    </div>
  );
}
