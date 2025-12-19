import { format } from 'date-fns';
import { Order } from '@/types/order';

/**
 * Generates order number in format DDMM-XXX
 * Example: 1912-001 (December 19th, order #1)
 */
export const generateOrderNumber = (order: Order, allOrders: Order[]): string => {
  const orderDate = new Date(order.created_at);
  const datePart = format(orderDate, 'ddMM');
  
  // Filter orders from the same day and sort by created_at
  const startOfDay = new Date(orderDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(orderDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const ordersFromSameDay = allOrders
    .filter(o => {
      const oDate = new Date(o.created_at);
      return oDate >= startOfDay && oDate <= endOfDay;
    })
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  // Find the position of this order (1-indexed)
  const position = ordersFromSameDay.findIndex(o => o.id === order.id) + 1;
  const sequenceNumber = position > 0 ? position : 1;
  
  return `${datePart}-${sequenceNumber.toString().padStart(3, '0')}`;
};

/**
 * Simple version when we don't have access to all orders
 * Uses timestamp to derive a pseudo-sequential number
 */
export const generateOrderNumberSimple = (order: Order): string => {
  const orderDate = new Date(order.created_at);
  const datePart = format(orderDate, 'ddMM');
  
  // Use last 3 digits of timestamp seconds since midnight as sequence
  const secondsSinceMidnight = 
    orderDate.getHours() * 3600 + 
    orderDate.getMinutes() * 60 + 
    orderDate.getSeconds();
  
  // Create a more sequential-looking number based on order time
  const sequenceNumber = Math.floor(secondsSinceMidnight / 60) + 1; // ~1 per minute
  
  return `${datePart}-${sequenceNumber.toString().padStart(3, '0')}`;
};
