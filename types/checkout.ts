import { CartLineItem } from "@/types/product";
import { DeliveryFeeConfig } from "@/lib/delivery";

export interface CheckoutCustomerPayload {
  name: string;
  phone: string;
  email?: string;
}

export interface CheckoutAddressPayload {
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface CheckoutPayload {
  customer: CheckoutCustomerPayload;
  address: CheckoutAddressPayload;
  delivery?: {
    distanceKm?: number;
    feeConfig?: DeliveryFeeConfig | null;
  };
  items: CartLineItem[];
  notes?: string;
  couponCode?: string;
}

export interface CheckoutOrderResult {
  id: number;
  status: string;
  total: number;
  paymentMethod: string;
  customerName: string;
  phone: string;
  email: string;
  addressSummary: string;
}
