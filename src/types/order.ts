export interface OrderItem {
  cantidad: number;
  item: string;
  descripcion: string;
}

export type OrderStatus = 'entrante' | 'preparacion' | 'retirar' | 'enviar' | 'terminadas';

export interface Order {
  id: string;
  items: OrderItem[];
  comentariosGenerales: string | null;
  lugarEntrega: string;
  telefono: string | null;
  nombre: string | null;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  venue_name?: string;
}
