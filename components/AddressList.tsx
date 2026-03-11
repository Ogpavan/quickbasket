import { AddressCard } from "@/components/AddressCard";

interface AddressListProps {
  addresses: Array<{
    id: number;
    type: string;
    name: string;
    address: string;
  }>;
}

export function AddressList({ addresses }: AddressListProps) {
  return (
    <div className="space-y-4">
      {addresses.map((item) => (
        <AddressCard key={item.id} type={item.type} name={item.name} address={item.address} />
      ))}
    </div>
  );
}
