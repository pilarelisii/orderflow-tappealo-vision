export interface OrderItem {
  quantity: number;
  name: string;
  description: string;
  product_id: string | null;
}

export type OrderStatus = 'entrante' | 'preparacion' | 'retirar' | 'enviar' | 'terminadas';

export interface Order {
  id: string;
  items: OrderItem[];
  additional_comments: string | null;
  qr_location_id: string;
  phone: string | null;
  name: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  ref_order_id: string;
  venue_id: string;
  payment_method: string;
}
