import { type ReactNode } from "react";
import { Sparkles, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "primary" | "secondary" | "success" | "warning";
  hint?: string;
}) {
  const toneMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <Card className="flex items-center gap-4 rounded-2xl border-border p-4 shadow-soft transition-transform hover:-translate-y-0.5">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${toneMap[tone]}`}>
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
      </div>
    </Card>
  );
}

export function QuickCard({
  label,
  desc,
  icon: Icon,
  onClick,
}: {
  label: string;
  desc: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-primary transition-colors group-hover:bg-brand group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}

export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 rounded-3xl border-dashed border-border p-12 text-center shadow-soft">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
        <Sparkles className="h-7 w-7" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{note}</p>
      <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
        Coming soon
      </span>
    </Card>
  );
}
