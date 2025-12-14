export interface OrderItem {
  cantidad: number;
  item: string;
  descripcion: string;
}

export type OrderStatus = 'entrante' | 'preparacion' | 'retirar' | 'enviar' | 'terminadas';

export interface Order {
  id: string;
  items: OrderItem[];
  comentarios_generales: string | null;
  lugar_entrega: string;
  telefono: string | null;
  nombre: string | null;
  payment_method: string | null;
  total: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  venue_name?: string;
}
