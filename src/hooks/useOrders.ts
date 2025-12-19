import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Order, OrderStatus } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { RealtimeChannel } from "@supabase/supabase-js";

// Helper to map DB row to Order type
const mapToOrder = (row: Record<string, unknown>): Order => ({
  id: row.id as string,
  items: row.items as Order['items'],
  comentarios_generales: (row.comentarios_generales as string) ?? null,
  lugar_entrega: row.lugar_entrega as string,
  telefono: (row.telefono as string) ?? null,
  nombre: (row.nombre as string) ?? null,
  payment_method: (row.payment_method as string) ?? null,
  total: row.total as number,
  status: row.status as OrderStatus,
  created_at: row.created_at as string,
  updated_at: row.updated_at as string,
});

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { playNotificationSound } = useNotificationSound();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async () => {
    console.log('📥 Fetching orders...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive",
      });
      return;
    }

    console.log(`✅ Fetched ${data.length} orders`);
    setOrders(data.map(d => mapToOrder(d as Record<string, unknown>)));
    setLoading(false);
  }, [toast]);

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

  const setupRealtimeSubscription = useCallback(() => {
    // Clean up existing channel
    if (channelRef.current) {
      console.log('🔄 Cleaning up existing channel...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('📡 Setting up realtime subscription...');
    
    const channel = supabase
      .channel('orders-realtime', {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📨 Realtime event received:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = mapToOrder(payload.new as Record<string, unknown>);
            console.log('🆕 New order:', newOrder.id);
            setOrders(prev => {
              // Avoid duplicates
              if (prev.some(o => o.id === newOrder.id)) {
                console.log('⚠️ Order already exists, skipping');
                return prev;
              }
              return [newOrder, ...prev];
            });
            
            playNotificationSound();
            
            toast({
              title: "🔔 Nuevo pedido",
              description: `Pedido recibido: ${newOrder.lugar_entrega}`,
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = mapToOrder(payload.new as Record<string, unknown>);
            console.log('📝 Order updated:', updatedOrder.id);
            setOrders(prev => 
              prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as Record<string, unknown>).id as string;
            console.log('🗑️ Order deleted:', deletedId);
            setOrders(prev => prev.filter(o => o.id !== deletedId));
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Subscription status:', status);
        
        if (err) {
          console.error('❌ Subscription error:', err);
          setIsConnected(false);
          
          // Attempt reconnection
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            setupRealtimeSubscription();
          }, 3000);
          return;
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to realtime - orders channel');
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('⚠️ Channel closed or error, will reconnect...');
          setIsConnected(false);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            setupRealtimeSubscription();
          }, 3000);
        }
      });

    channelRef.current = channel;
  }, [toast, playNotificationSound]);

  useEffect(() => {
    fetchOrders();
    setupRealtimeSubscription();

    // Handle visibility change for reconnection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab visible, checking connection...');
        fetchOrders(); // Refresh data when tab becomes visible
        if (!isConnected) {
          setupRealtimeSubscription();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🧹 Cleaning up useOrders...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchOrders, setupRealtimeSubscription, isConnected]);

  const isOrderRecent = (order: Order) => {
    const now = new Date();
    const orderDate = new Date(order.created_at);
    const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    const filtered = orders.filter(order => order.status === status);
    return filtered.filter(isOrderRecent);
  };

  const getOrdersByDate = (date: Date) => {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      
      if (orderDate.getTime() !== targetDate.getTime()) return false;
      
      const now = new Date();
      const hoursDiff = (now.getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60);
      return hoursDiff > 24;
    });
  };

  const getAvailableDates = () => {
    const dates = new Set<string>();
    const now = new Date();
    
    orders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const hoursDiff = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        const dateStr = orderDate.toISOString().split('T')[0];
        dates.add(dateStr);
      }
    });
    
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  };

  return {
    orders,
    loading,
    isConnected,
    getOrdersByStatus,
    getOrdersByDate,
    getAvailableDates,
    updateOrderStatus,
    refetch: fetchOrders,
  };
}
