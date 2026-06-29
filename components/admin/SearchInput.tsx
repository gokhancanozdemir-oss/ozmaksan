"use client";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "Ara…",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ozmaksan-muted"
        aria-hidden
      >
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border-2 border-ozmaksan-border bg-ozmaksan-bg pl-11 pr-4 text-ozmaksan-text placeholder:text-ozmaksan-muted/50 focus:border-ozmaksan-accent focus:outline-none"
      />
    </div>
  );
}
