import { CartLineItem } from "@/types/product";

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
