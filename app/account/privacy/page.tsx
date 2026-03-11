import { AccountShell } from "@/components/AccountShell";

export default function AccountPrivacyPage() {
  return (
    <AccountShell title="Account privacy">
      <div className="rounded-xl border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Manage your account privacy preferences here.
      </div>
    </AccountShell>
  );
}
