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
  
  // Use refs to avoid stale closures in callbacks
  const toastRef = useRef(toast);
  const playNotificationSoundRef = useRef(playNotificationSound);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSettingUpRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const channelIdRef = useRef(0); // To track which channel is active

  // Keep refs updated
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    playNotificationSoundRef.current = playNotificationSound;
  }, [playNotificationSound]);

  const fetchOrders = useCallback(async () => {
    console.log('📥 Fetching orders...');
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching orders:', error);
      toastRef.current({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive",
      });
      return;
    }

    console.log(`✅ Fetched ${data.length} orders`);
    setOrders(data.map(d => mapToOrder(d as Record<string, unknown>)));
    setLoading(false);
  }, []);

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
    // Prevent duplicate setup calls
    if (isSettingUpRef.current) {
      console.log('⏳ Setup already in progress, skipping...');
      return;
    }
    isSettingUpRef.current = true;

    // Clean up existing channel
    if (channelRef.current) {
      console.log('🔄 Cleaning up existing channel...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Increment channel ID to track which channel is active
    const currentChannelId = ++channelIdRef.current;
    console.log(`📡 Setting up realtime subscription (channel #${currentChannelId})...`);
    
    const channel = supabase
      .channel(`orders-realtime-${currentChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          // Ignore events from old channels
          if (currentChannelId !== channelIdRef.current) {
            console.log(`📨 Ignoring event from old channel #${currentChannelId}`);
            return;
          }

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
            
            playNotificationSoundRef.current();
            
            toastRef.current({
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
        // Ignore status from old channels
        if (currentChannelId !== channelIdRef.current) {
          console.log(`📡 Ignoring status from old channel #${currentChannelId}: ${status}`);
          return;
        }

        console.log(`📡 Channel #${currentChannelId} status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to realtime - orders channel');
          setIsConnected(true);
          isSettingUpRef.current = false;
          reconnectAttemptsRef.current = 0; // Reset backoff on success
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Channel error, will reconnect with backoff...');
          setIsConnected(false);
          isSettingUpRef.current = false;
          
          // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
          const backoff = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`🔄 Reconnecting in ${backoff}ms (attempt #${reconnectAttemptsRef.current})...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription();
          }, backoff);
        } else if (status === 'CLOSED') {
          // Only reconnect if this was unexpected (not from cleanup)
          if (channelRef.current === channel) {
            console.log('⚠️ Channel closed unexpectedly, reconnecting...');
            setIsConnected(false);
            isSettingUpRef.current = false;
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setupRealtimeSubscription();
            }, 1000);
          } else {
            console.log('📡 Channel closed (expected from cleanup)');
          }
        }
        
        if (err) {
          console.error('❌ Subscription error:', err);
        }
      });

    channelRef.current = channel;
  }, []);

  useEffect(() => {
    fetchOrders();
    setupRealtimeSubscription();

    // Polling every 30 seconds as fallback for realtime
    const pollInterval = setInterval(() => {
      console.log('🔄 Polling for new orders (30s fallback)...');
      fetchOrders();
    }, 30000);

    // Handle visibility change for reconnection
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Tab visible, refreshing data...');
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🧹 Cleaning up useOrders...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollInterval);
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchOrders, setupRealtimeSubscription]);

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
