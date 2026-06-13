import { STATUS_CONFIG } from "@/lib/utils";
export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.VIGENTE;
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.text + "30" }}>
      {cfg.label}
    </span>
  );
}
