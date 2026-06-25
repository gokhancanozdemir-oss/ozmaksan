import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-ozmaksan-bg px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-ozmaksan-accent text-xl font-bold text-white">
          Ö
        </div>
        <div>
          <p className="text-2xl font-bold text-ozmaksan-text">ÖZMAKSAN</p>
          <p className="text-sm text-ozmaksan-muted">WMS & MES Hibrit Sistemi</p>
        </div>
      </div>
      <LoginForm />
    </div>
  );
}
