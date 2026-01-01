// ESC/POS command generator for thermal printers
import { Order } from '@/types/order';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const COMMANDS = {
  INIT: ESC + '@',                    // Initialize printer
  CENTER: ESC + 'a' + '\x01',         // Center alignment
  LEFT: ESC + 'a' + '\x00',           // Left alignment
  RIGHT: ESC + 'a' + '\x02',          // Right alignment
  BOLD_ON: ESC + 'E' + '\x01',        // Bold on
  BOLD_OFF: ESC + 'E' + '\x00',       // Bold off
  DOUBLE_HEIGHT: GS + '!' + '\x10',   // Double height
  DOUBLE_WIDTH: GS + '!' + '\x20',    // Double width
  DOUBLE_SIZE: GS + '!' + '\x30',     // Double height and width
  NORMAL_SIZE: GS + '!' + '\x00',     // Normal size
  CUT: GS + 'V' + 'A',                // Partial cut
  FULL_CUT: GS + 'V' + '\x00',        // Full cut
  FEED: ESC + 'd' + '\x03',           // Feed 3 lines
  LINE: '--------------------------------\n',
  DOUBLE_LINE: '================================\n',
};

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(price);
};

export const generateReceiptCommands = (order: Order, venueName: string, orderNumber?: string): string[] => {
  const commands: string[] = [];
  const orderDate = new Date(order.created_at);
  const formattedDate = format(orderDate, "dd/MM/yyyy HH:mm", { locale: es });
  const displayOrderNumber = orderNumber || order.id.slice(-6).toUpperCase();
  
  // Initialize
  commands.push(COMMANDS.INIT);
  
  // Header - Venue name
  commands.push(COMMANDS.CENTER);
  commands.push(COMMANDS.DOUBLE_SIZE);
  commands.push(COMMANDS.BOLD_ON);
  commands.push(`${venueName}\n`);
  commands.push(COMMANDS.NORMAL_SIZE);
  commands.push(COMMANDS.BOLD_OFF);
  commands.push('\n');
  
  // Order number
  commands.push(COMMANDS.DOUBLE_HEIGHT);
  commands.push(COMMANDS.BOLD_ON);
  commands.push(`PEDIDO #${displayOrderNumber}\n`);
  commands.push(COMMANDS.NORMAL_SIZE);
  commands.push(COMMANDS.BOLD_OFF);
  commands.push('\n');
  
  // Date and time
  commands.push(COMMANDS.NORMAL_SIZE);
  commands.push(`${formattedDate}\n`);
  commands.push(COMMANDS.DOUBLE_LINE);
  
  // Items
  commands.push(COMMANDS.LEFT);
  commands.push(COMMANDS.BOLD_ON);
  commands.push('ITEMS:\n');
  commands.push(COMMANDS.BOLD_OFF);
  commands.push(COMMANDS.LINE);
  
  order.items.forEach((item) => {
    commands.push(COMMANDS.BOLD_ON);
    commands.push(`${item.quantity}x ${item.name}\n`);
    commands.push(COMMANDS.BOLD_OFF);
    
    if (item.description && item.description.trim()) {
      commands.push(`   ${item.description}\n`);
    }
  });
  
  commands.push(COMMANDS.LINE);
  
  // Delivery info
  if (order.qr_location_id) {
    commands.push(COMMANDS.BOLD_ON);
    commands.push('ENTREGA:\n');
    commands.push(COMMANDS.BOLD_OFF);
    commands.push(`${order.qr_location_id}\n`);
    commands.push('\n');
  }
  
  // Customer info
  if (order.name) {
    commands.push(`Cliente: ${order.name}\n`);
  }
  
  if (order.phone) {
    commands.push(`Tel: ${order.phone}\n`);
  }
  
  if (order.payment_method) {
    commands.push(`Pago: ${order.payment_method}\n`);
  }
  
  // Comments
  if (order.additional_comments) {
    commands.push('\n');
    commands.push(COMMANDS.LINE);
    commands.push(COMMANDS.BOLD_ON);
    commands.push('NOTAS:\n');
    commands.push(COMMANDS.BOLD_OFF);
    commands.push(`${order.additional_comments}\n`);
  }
  
  // Total
  commands.push(COMMANDS.DOUBLE_LINE);
  commands.push(COMMANDS.CENTER);
  commands.push(COMMANDS.DOUBLE_SIZE);
  commands.push(COMMANDS.BOLD_ON);
  commands.push(`TOTAL: ${formatPrice(order.total)}\n`);
  commands.push(COMMANDS.NORMAL_SIZE);
  commands.push(COMMANDS.BOLD_OFF);
  
  // Footer
  commands.push('\n');
  commands.push(COMMANDS.NORMAL_SIZE);
  commands.push('Gracias por su pedido!\n');
  commands.push('\n\n');
  
  // Cut paper
  commands.push(COMMANDS.FEED);
  commands.push(COMMANDS.CUT);
  
  return commands;
};

export const generateTestReceipt = (venueName: string): string[] => {
  const commands: string[] = [];
  
  commands.push(COMMANDS.INIT);
  commands.push(COMMANDS.CENTER);
  commands.push(COMMANDS.DOUBLE_SIZE);
  commands.push(COMMANDS.BOLD_ON);
  commands.push(`${venueName}\n`);
  commands.push(COMMANDS.NORMAL_SIZE);
  commands.push(COMMANDS.BOLD_OFF);
  commands.push('\n');
  commands.push(COMMANDS.DOUBLE_LINE);
  commands.push('PRUEBA DE IMPRESION\n');
  commands.push(COMMANDS.LINE);
  commands.push(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm")}\n`);
  commands.push('\n');
  commands.push('Si puedes ver este ticket,\n');
  commands.push('la impresora esta configurada\n');
  commands.push('correctamente!\n');
  commands.push('\n');
  commands.push(COMMANDS.DOUBLE_LINE);
  commands.push('\n\n');
  commands.push(COMMANDS.FEED);
  commands.push(COMMANDS.CUT);
  
  return commands;
};
