"use client";

// ============================================================
// 🏷️ STATUS BADGE
// ============================================================
// Reusable status badge dengan dukungan dual theme.
// Light: soft colors. Dark: glowing dots.
// ============================================================

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { className: string; label: string }> = {
  LUNAS: {
    className: "status-lunas",
    label: "Lunas",
  },
  DP: {
    className: "status-dp",
    label: "DP",
  },
  MENUNGGU_PELUNASAN: {
    className: "status-dp",
    label: "Menunggu Pelunasan",
  },
  BATAL: {
    className: "status-batal",
    label: "Batal",
  },
  MENUNGGU: {
    className: "status-menunggu",
    label: "Menunggu",
  },
  MENYIMPAN: {
    className: "status-menunggu",
    label: "Menyimpan...",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    className: "status-menunggu",
    label: status,
  };

  const isSaving = status === "MENYIMPAN";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.className} ${className}`}
    >
      {isSaving ? (
        <span className="w-1.5 h-1.5 rounded-full inline-block border border-current border-t-transparent animate-spin" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full inline-block dot" />
      )}
      {config.label}
    </span>
  );
}