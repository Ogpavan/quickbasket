import { AccountShell } from "@/components/AccountShell";
import { AddressList } from "@/components/AddressList";

const addresses = [
  {
    id: 1,
    type: "Home",
    name: "Pawan Pal",
    address: "31, Paani ki tanki, Subhash Nagar Colony, Bareilly"
  },
  {
    id: 2,
    type: "Home",
    name: "Pawan Pal",
    address: "Inventive Infosoft, Suresh Sharma Nagar, Bareilly"
  }
];

export default function AddressesPage() {
  return (
    <AccountShell
      title="My addresses"
      action={
        <button
          type="button"
          className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
        >
          + Add new address
        </button>
      }
    >
      <AddressList addresses={addresses} />
    </AccountShell>
  );
}
