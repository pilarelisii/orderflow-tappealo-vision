import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/order";
import { useToast } from "@/hooks/use-toast";

// Helper to map DB row to Order type
const mapToOrder = (row: Record<string, unknown>): Order => ({
  id: row.id as string,
  items: row.items as Order['items'],
  comentarios_generales: (row.comentarios_generales as string) ?? null,
  lugar_entrega: row.lugar_entrega as string,
  telefono: (row.telefono as string) ?? null,
  total: row.total as number,
  status: row.status as OrderStatus,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive",
      });
      return;
    }

    setOrders(data.map(d => mapToOrder(d as Record<string, unknown>)));
    setLoading(false);
  };

  const updateOrderStatus = async (order: Order, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id);

    if (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el pedido",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Pedido actualizado",
      description: `Pedido movido a ${newStatus}`,
    });
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = mapToOrder(payload.new as Record<string, unknown>);
            setOrders(prev => [newOrder, ...prev]);
            toast({
              title: "Nuevo pedido",
              description: `Pedido recibido: ${newOrder.lugar_entrega}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = mapToOrder(payload.new as Record<string, unknown>);
            setOrders(prev => 
              prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            setOrders(prev => prev.filter(o => o.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isOrderFromToday = (order: Order) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const orderDate = new Date(order.created_at);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    const filtered = orders.filter(order => order.status === status);
    
    // For "terminadas", only show today's completed orders
    if (status === 'terminadas') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return filtered.filter(order => {
        const orderDate = new Date(order.updated_at);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
    }
    
    // For active columns, only show orders created today
    return filtered.filter(isOrderFromToday);
  };

  const getOrdersByDate = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get terminated orders from that date
    const terminatedOrders = orders.filter(order => {
      if (order.status !== 'terminadas') return false;
      const orderDate = new Date(order.updated_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === targetDate.getTime();
    });
    
    // Get non-terminated orders created on that date (old orders stuck in columns)
    const oldActiveOrders = orders.filter(order => {
      if (order.status === 'terminadas') return false;
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === targetDate.getTime() && orderDate.getTime() < today.getTime();
    });
    
    return [...terminatedOrders, ...oldActiveOrders];
  };

  const getAvailableDates = () => {
    const dates = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add dates from terminated orders
    orders
      .filter(o => o.status === 'terminadas')
      .forEach(order => {
        const orderDate = new Date(order.updated_at);
        orderDate.setHours(0, 0, 0, 0);
        if (orderDate.getTime() < today.getTime()) {
          dates.add(orderDate.toISOString().split('T')[0]);
        }
      });
    
    // Add dates from old active orders (stuck in columns from previous days)
    orders
      .filter(o => o.status !== 'terminadas')
      .forEach(order => {
        const orderDate = new Date(order.created_at);
        orderDate.setHours(0, 0, 0, 0);
        if (orderDate.getTime() < today.getTime()) {
          dates.add(orderDate.toISOString().split('T')[0]);
        }
      });
    
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  };

  return {
    orders,
    loading,
    getOrdersByStatus,
    getOrdersByDate,
    getAvailableDates,
    updateOrderStatus,
    refetch: fetchOrders,
  };
}
