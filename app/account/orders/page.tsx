import { AccountOrdersPane } from "@/components/AccountOrdersPane";
import { AccountShell } from "@/components/AccountShell";

export default function AccountOrdersPage() {
  return (
    <AccountShell>
      <AccountOrdersPane />
    </AccountShell>
  );
}
