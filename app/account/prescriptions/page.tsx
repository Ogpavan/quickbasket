import { AccountShell } from "@/components/AccountShell";

export default function PrescriptionsPage() {
  return (
    <AccountShell title="My prescriptions">
      <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        No prescriptions saved yet.
      </div>
    </AccountShell>
  );
}
