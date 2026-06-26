import LoginForm from "@/components/LoginForm";
import OzmaksanLogo from "@/components/OzmaksanLogo";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-ozmaksan-bg px-4 py-12">
      <div className="mb-10 flex flex-col items-center gap-4">
        <OzmaksanLogo size="lg" href={null} />
        <div className="h-0.5 w-32 bg-ozmaksan-red" />
        <p className="text-sm font-medium tracking-wide text-ozmaksan-muted">
          WMS & MES Hibrit Sistemi
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
