import Image from "next/image";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      {/* Left panel - corporate branding */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden bg-ozmaksan-surface px-8 py-12 lg:w-1/2 lg:min-h-full">
        {/* Background grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,#e8edf2 0,#e8edf2 1px,transparent 0,transparent 50%),repeating-linear-gradient(90deg,#e8edf2 0,#e8edf2 1px,transparent 0,transparent 50%)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Accent glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ozmaksan-accent/5 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center gap-8 text-center">
          {/* Logo */}
          <div className="relative h-28 w-28 overflow-hidden rounded-2xl bg-ozmaksan-bg ring-2 ring-ozmaksan-border shadow-2xl">
            <Image
              src="/ozmaksan-logo.svg"
              alt="ÖZMAKSAN Logo"
              fill
              className="object-contain p-3"
              priority
            />
          </div>

          <div>
            <h1 className="text-4xl font-black tracking-tight text-ozmaksan-text">
              ÖZMAKSAN
            </h1>
            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.25em] text-ozmaksan-accent">
              Yüksek Isı Teknolojisi
            </p>
          </div>

          {/* Divider */}
          <div className="flex w-full max-w-xs items-center gap-3">
            <div className="h-px flex-1 bg-ozmaksan-border" />
            <span className="text-xs text-ozmaksan-muted">WMS & MES</span>
            <div className="h-px flex-1 bg-ozmaksan-border" />
          </div>

          {/* System description */}
          <div className="max-w-xs space-y-3">
            <FeatureBadge icon="📦" text="QR Kodlu Hammadde Takibi" />
            <FeatureBadge icon="🏭" text="Proje Bazlı Üretim Maliyeti" />
            <FeatureBadge icon="📊" text="Anlık Stok Durumu" />
            <FeatureBadge icon="🔩" text="Sac & Standart Malzeme Yönetimi" />
          </div>

          {/* Company address */}
          <div className="mt-4 rounded-xl border border-ozmaksan-border bg-ozmaksan-bg/50 px-5 py-4 text-xs text-ozmaksan-muted space-y-1">
            <p className="font-semibold text-ozmaksan-text text-sm">ÖZMAKSAN ISI SANAYİ TİCARET A.Ş.</p>
            <p>4. Org. San. Bölgesi 83404 Nolu Cadde No:10</p>
            <p>Başpınar / GAZİANTEP</p>
            <p className="pt-1 font-medium text-ozmaksan-accent">
              📞 +90 342 220 40 56
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-ozmaksan-bg px-6 py-12">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

function FeatureBadge({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ozmaksan-border bg-ozmaksan-bg/40 px-4 py-3 text-left">
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-ozmaksan-text">{text}</span>
    </div>
  );
}
