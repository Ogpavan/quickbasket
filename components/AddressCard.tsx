import { Home, MoreVertical } from "lucide-react";

interface AddressCardProps {
  type: string;
  name: string;
  address: string;
}

export function AddressCard({ type, name, address }: AddressCardProps) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-emerald-600">
        <Home className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-900">{type}</p>
          <span className="text-xs text-slate-400">•</span>
          <p className="text-xs text-slate-500">{name}</p>
        </div>
        <p className="mt-1 text-sm text-slate-600">{address}</p>
      </div>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        aria-label="Address actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
