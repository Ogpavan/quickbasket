import { AccountShell } from "@/components/AccountShell";

export default function GiftCardsPage() {
  return (
    <AccountShell title="E-Gift Cards">
      <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        You have no gift cards yet.
      </div>
    </AccountShell>
  );
}
