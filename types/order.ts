export interface OrderLineItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  total: string;
  subtotal?: string;
  price?: number;
  image?: string;
}

export interface AccountOrder {
  id: number;
  status: string;
  total: string;
  payment_method: string;
  payment_method_title?: string;
  date_created: string;
  date_paid?: string | null;
  date_completed?: string | null;
  discount_total?: string;
  shipping_total?: string;
  total_tax?: string;
  currency?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shipping?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items?: OrderLineItem[];
}
