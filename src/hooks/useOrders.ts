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

  const isOrderRecent = (order: Order) => {
    const now = new Date();
    const orderDate = new Date(order.created_at);
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    const filtered = orders.filter(order => order.status === status);
    
    // For "terminadas", only show orders completed in the last 24h
    if (status === 'terminadas') {
      const now = new Date();
      return filtered.filter(order => {
        const updatedDate = new Date(order.updated_at);
        const hoursDiff = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 24;
      });
    }
    
    // For active columns, only show orders created in the last 24h
    return filtered.filter(isOrderRecent);
  };

  const getOrdersByDate = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get all orders from that date (terminated by updated_at, others by created_at)
    return orders.filter(order => {
      const orderDate = order.status === 'terminadas' 
        ? new Date(order.updated_at) 
        : new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === targetDate.getTime();
    }).filter(order => {
      // Only include orders older than 24h
      const now = new Date();
      const refDate = new Date(order.status === 'terminadas' ? order.updated_at : order.created_at);
      const hoursDiff = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    });
  };

  const getAvailableDates = () => {
    const dates = new Set<string>();
    const now = new Date();
    
    orders.forEach(order => {
      const refDate = new Date(order.status === 'terminadas' ? order.updated_at : order.created_at);
      const hoursDiff = (now.getTime() - refDate.getTime()) / (1000 * 60 * 60);
      
      // Only include orders older than 24h
      if (hoursDiff > 24) {
        const dateStr = refDate.toISOString().split('T')[0];
        dates.add(dateStr);
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
