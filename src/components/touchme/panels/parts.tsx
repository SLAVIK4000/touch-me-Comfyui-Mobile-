"use client";

/**
 * Общие элементы панелей настроек Touch me.
 */

export function ActionButton({
  children,
  onClick,
  variant = "default",
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "accent" | "danger" | "ghost";
  className?: string;
  ariaLabel?: string;
}) {
  const styles: Record<string, string> = {
    default:
      "border-[var(--tm-border)] text-[var(--tm-text)] active:bg-[rgba(148,130,255,0.12)]",
    accent:
      "border-[rgba(167,139,250,0.6)] bg-[rgba(139,92,246,0.18)] text-[var(--tm-violet)] tm-glow",
    danger:
      "border-[rgba(248,113,113,0.5)] text-[#f87171] active:bg-[rgba(248,113,113,0.12)]",
    ghost:
      "border-transparent text-[var(--tm-text-dim)] active:text-[var(--tm-text)]",
  };
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`tm-mono flex items-center justify-center gap-2 border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function PanelRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="tm-glass-block flex flex-col gap-1.5 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tm-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--tm-text-dim)]">
          {label}
        </span>
        {value !== undefined && (
          <span className="tm-mono text-[11px] font-medium text-[var(--tm-violet)]">
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="tm-mono flex items-center justify-center border border-dashed border-[var(--tm-border-soft)] px-3 py-5 text-center text-[9.5px] tracking-[0.14em] text-[var(--tm-text-dim)]">
      {children}
    </div>
  );
}

export function BlockShell({
  title,
  onRemove,
  children,
  accent = false,
}: {
  title: string;
  onRemove?: () => void;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`tm-glass-block relative p-3 ${
        accent ? "!border-[rgba(96,165,250,0.32)]" : ""
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className={`tm-mono text-[9px] uppercase tracking-[0.22em] ${
            accent ? "text-[var(--tm-blue)]" : "text-[var(--tm-text-dim)]"
          }`}
        >
          {title}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="tm-mono border border-[rgba(248,113,113,0.4)] px-2 py-0.5 text-[8.5px] uppercase tracking-[0.14em] text-[#f87171] active:bg-[rgba(248,113,113,0.12)]"
            aria-label={`Удалить блок ${title}`}
          >
            удалить
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
