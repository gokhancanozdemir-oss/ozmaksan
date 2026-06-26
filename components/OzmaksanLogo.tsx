import Image from "next/image";
import Link from "next/link";

type OzmaksanLogoProps = {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
};

const sizes = {
  sm: { width: 120, height: 48, className: "h-10 w-auto" },
  md: { width: 180, height: 72, className: "h-14 w-auto" },
  lg: { width: 260, height: 104, className: "h-24 w-auto sm:h-28" },
};

export default function OzmaksanLogo({
  size = "md",
  href = "/",
  className = "",
}: OzmaksanLogoProps) {
  const { width, height, className: sizeClass } = sizes[size];

  const img = (
    <Image
      src="/ozmaksan-logo.png"
      alt="ÖZMAKSAN — Yüksek Isı Teknolojisi"
      width={width}
      height={height}
      className={`object-contain ${sizeClass} ${className}`}
      priority
    />
  );

  if (href != null) {
    return (
      <Link href={href} className="inline-flex shrink-0">
        {img}
      </Link>
    );
  }

  return <span className="inline-flex shrink-0">{img}</span>;
}
