import AppHeader from "@/components/AppHeader";
import ProductionTrackerLoader from "@/components/ProductionTrackerLoader";
import DashboardPanelLoader from "@/components/DashboardPanelLoader";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-ozmaksan-bg">
      <AppHeader />

      <main className="flex flex-1 flex-col px-4 py-8 sm:px-8">
        {/* Dashboard KPIs */}
        <section className="mb-10">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-xl font-bold text-ozmaksan-text">
              Genel Bakış
            </h2>
            <div className="h-px flex-1 bg-ozmaksan-border" />
          </div>
          <DashboardPanelLoader />
        </section>

        {/* QR Scan section */}
        <section>
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-xl font-bold text-ozmaksan-text">
              Sarfiyat Girişi
            </h2>
            <div className="h-px flex-1 bg-ozmaksan-border" />
          </div>
          <p className="mb-6 text-sm text-ozmaksan-muted">
            QR kodu okutarak hammadde tüketimini proje bazında kaydedin
          </p>
          <div className="flex flex-col items-center">
            <ProductionTrackerLoader />
          </div>
        </section>
      </main>

      <footer className="border-t border-ozmaksan-border bg-ozmaksan-surface px-4 py-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-ozmaksan-accent/20 flex items-center justify-center">
                <span className="text-xs font-black text-ozmaksan-accent">Ö</span>
              </div>
              <div>
                <p className="text-sm font-bold text-ozmaksan-text">ÖZMAKSAN ISI SANAYİ TİCARET A.Ş.</p>
                <p className="text-xs text-ozmaksan-muted">Yüksek Isı Teknolojisi · WMS & MES Hibrit Sistemi</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-ozmaksan-muted">
              <span>📞 +90 342 220 40 56</span>
              <span>📍 4. OSB Başpınar, GAZİANTEP</span>
              <a
                href="https://www.ozmaksan.com.tr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ozmaksan-accent hover:underline"
              >
                🌐 ozmaksan.com.tr
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
