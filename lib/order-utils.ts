export function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-rose-50 text-rose-600 border-rose-200";
  }
  if (normalized === "processing" || normalized === "on-hold") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (normalized === "completed" || normalized === "delivered") {
    return "bg-emerald-50 text-emerald-600 border-emerald-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}
