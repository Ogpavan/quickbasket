import { AddressCard, AddressCardData } from "@/components/AddressCard";

interface AddressListProps {
  addresses: AddressCardData[];
}

export function AddressList({ addresses }: AddressListProps) {
  return (
    <div className="space-y-4">
      {addresses.map((item) => (
        <AddressCard key={item.id ?? `${item.label}-${item.address_line}`} data={item} />
      ))}
    </div>
  );
}
