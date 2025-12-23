import { Order, OrderStatus } from "@/types/order";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, MapPin, MessageSquare, Clock, Printer, Phone, CreditCard, Banknote } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { isQZConnected, printRaw } from "@/lib/qzTray";
import { generateReceiptCommands } from "@/lib/escpos";
import { useToast } from "@/hooks/use-toast";
interface OrderCardProps {
  order: Order;
  onMoveNext: (order: Order) => void;
  onMovePrev: (order: Order) => void;
  canMoveNext: boolean;
  canMovePrev: boolean;
  venueName?: string;
  orderNumber?: string;
}
const statusConfig: Record<OrderStatus, {
  next: OrderStatus | null;
  label: string;
}> = {
  entrante: {
    next: 'preparacion',
    label: 'Preparar'
  },
  preparacion: {
    next: 'retirar',
    label: 'Listo'
  },
  retirar: {
    next: 'enviar',
    label: 'Enviar'
  },
  enviar: {
    next: 'terminadas',
    label: 'Terminar'
  },
  terminadas: {
    next: null,
    label: ''
  }
};
export function OrderCard({
  order,
  onMoveNext,
  onMovePrev,
  canMoveNext,
  canMovePrev,
  venueName,
  orderNumber
}: OrderCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const {
    toast
  } = useToast();
  const PRINTER_STORAGE_KEY = 'tappealo_selected_printer';
  const OPEN_DRAWER_KEY = 'tappealo_open_drawer';
  const handlePrint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const selectedPrinter = localStorage.getItem(PRINTER_STORAGE_KEY);
    const openDrawer = localStorage.getItem(OPEN_DRAWER_KEY) === 'true';

    // Try QZ Tray first if connected and printer selected
    if (isQZConnected() && selectedPrinter) {
      setIsPrinting(true);
      try {
        const commands = generateReceiptCommands(order, venueName || 'PEDIDO', orderNumber);
        await printRaw(selectedPrinter, commands);
        if (openDrawer) {
          // ESC/POS command to open cash drawer
          await printRaw(selectedPrinter, ['\x1B\x70\x00\x19\x19']);
        }
        toast({
          title: "Impreso",
          description: "Ticket enviado a la impresora"
        });
        setIsPrinting(false);
        return;
      } catch (error) {
        console.error('QZ print failed, falling back to browser:', error);
        setIsPrinting(false);
      }
    }

    // Fallback to browser print
    printWithBrowser();
  };
  const printWithBrowser = () => {
    // Create a hidden iframe for printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);
    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) return;
    printDocument.open();
    const displayOrderNumber = orderNumber || order.id.slice(0, 8).toUpperCase();
    printDocument.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${displayOrderNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.3;
              width: 80mm;
            }
            .receipt {
              width: 80mm;
              padding: 2mm;
            }
            .header {
              text-align: center;
              border-bottom: 1px dashed black;
              padding-bottom: 4mm;
              margin-bottom: 4mm;
            }
            .header h1 {
              font-size: 16px;
              font-weight: bold;
              margin: 0 0 2mm 0;
            }
            .header p {
              margin: 0;
              font-size: 10px;
            }
            .items {
              border-bottom: 1px dashed black;
              padding-bottom: 4mm;
              margin-bottom: 4mm;
            }
            .item {
              margin-bottom: 3mm;
            }
            .item-header {
              font-weight: bold;
            }
            .item-desc {
              font-size: 10px;
              padding-left: 4mm;
            }
            .delivery {
              margin: 3mm 0;
              padding: 2mm;
              border: 1px solid black;
            }
            .comments {
              font-size: 10px;
              margin: 3mm 0;
              padding: 2mm;
              background: #eee;
            }
            .total {
              font-size: 16px;
              font-weight: bold;
              text-align: right;
              margin: 4mm 0;
              border-top: 1px solid black;
              padding-top: 2mm;
            }
            .footer {
              text-align: center;
              font-size: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>${venueName?.toUpperCase() || 'PEDIDO'}</h1>
              <p>Pedido #${displayOrderNumber}</p>
              <p>${new Date(order.created_at).toLocaleString('es-CL')}</p>
            </div>
            <div class="items">
              ${order.items.map(item => `
                <div class="item">
                  <div class="item-header">${item.cantidad}x ${item.item}</div>
                  ${item.descripcion ? `<div class="item-desc">→ ${item.descripcion}</div>` : ''}
                </div>
              `).join('')}
            </div>
            <div class="delivery">
              <strong>Entrega:</strong> ${order.lugar_entrega}
              ${order.telefono ? `<div style="margin-top: 2mm;"><strong>Tel:</strong> ${order.telefono}</div>` : ''}
              ${order.nombre ? `<div style="margin-top: 2mm;"><strong>Nombre:</strong> ${order.nombre}</div>` : ''}
              ${order.payment_method ? `<div style="margin-top: 2mm;"><strong>Pago:</strong> ${order.payment_method}</div>` : ''}
            </div>
            ${order.comentarios_generales ? `
              <div class="comments">
                <strong>Notas:</strong> ${order.comentarios_generales}
              </div>
            ` : ''}
            <div class="total">
              TOTAL: $${order.total.toLocaleString('es-CL')}
            </div>
            <div class="footer">
              <p>¡Gracias por tu pedido!</p>
              <p>- - - - - - - - - -</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printDocument.close();
    printFrame.contentWindow?.focus();
    printFrame.contentWindow?.print();

    // Remove iframe after printing
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  };
  const config = statusConfig[order.status];
  const timeAgo = formatDistanceToNow(new Date(order.created_at), {
    addSuffix: true,
    locale: es
  });
  const itemsSummary = order.items.map(i => `${i.cantidad}x ${i.item}`).join(', ');
  const handlers = useSwipeable({
    onSwiping: e => {
      const newOffset = e.deltaX;
      // Limit swipe based on direction availability
      if (newOffset > 0 && !canMoveNext || newOffset < 0 && !canMovePrev) {
        setSwipeOffset(newOffset * 0.2); // Resistance effect
      } else {
        setSwipeOffset(newOffset);
      }
      setIsSwiping(true);
    },
    onSwipedLeft: () => {
      if (canMovePrev && swipeOffset < -50) {
        onMovePrev(order);
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onSwipedRight: () => {
      if (canMoveNext && swipeOffset > 50) {
        onMoveNext(order);
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onTouchEndOrOnMouseUp: () => {
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
    delta: 10
  });
  const getSwipeIndicator = () => {
    if (!isSwiping) return null;
    if (swipeOffset > 25 && canMoveNext) {
      return <div className="absolute inset-y-0 left-0 w-16 bg-success/30 flex items-center justify-center rounded-l-lg transition-all">
          <ChevronRight className="w-6 h-6 text-success" />
        </div>;
    }
    if (swipeOffset < -25 && canMovePrev) {
      return <div className="absolute inset-y-0 right-0 w-16 bg-warning/30 flex items-center justify-center rounded-r-lg transition-all">
          <ChevronLeft className="w-6 h-6 text-warning" />
        </div>;
    }
    return null;
  };
  return <div className="relative mb-3" {...handlers}>
      {getSwipeIndicator()}
      <Card className="animate-fade-in hover:shadow-md overflow-hidden" style={{
      transform: `translateX(${swipeOffset * 0.5}px)`,
      transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
    }}>
        <div className="p-4">
          {/* Order number + Print button */}
          <div className="flex items-center justify-between mb-2">
            {orderNumber && <div className="text-xs font-light text-muted-foreground tracking-wider">
                #{orderNumber}
              </div>}
            <button 
              onClick={handlePrint} 
              disabled={isPrinting}
              className="p-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
              title="Imprimir ticket"
            >
              <Printer className="w-6 h-6" />
            </button>
          </div>
          
          {/* Items + Price - Main section */}
          <div className="flex justify-between gap-4 mb-3">
            <div className="flex-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="text-lg font-semibold text-foreground">
                  {item.cantidad}x {item.item}
                </div>
              ))}
            </div>
            <div className="text-2xl font-bold text-primary whitespace-nowrap">
              ${order.total.toLocaleString('es-CL')}
            </div>
          </div>
          
          {/* Customer info - Bigger text */}
          <div className="space-y-2 mb-3 pb-3 border-b border-border">
            {order.lugar_entrega && (
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <span className="text-base font-semibold">{order.lugar_entrega}</span>
              </div>
            )}
            
            {order.telefono && (
              <a 
                href={`https://wa.me/${order.telefono.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={e => e.stopPropagation()} 
                className="flex items-center gap-2 text-base text-success hover:underline font-medium"
              >
                <Phone className="w-5 h-5" />
                <span>{order.telefono}</span>
              </a>
            )}
            
            {order.nombre && (
              <div className="flex items-center gap-2 text-base text-foreground">
                <span className="font-medium">{order.nombre}</span>
              </div>
            )}
            
            {order.payment_method && (
              <div className="flex items-center gap-2 text-base">
                {order.payment_method.toLowerCase().includes('mercado') 
                  ? <CreditCard className="w-5 h-5 text-blue-500" /> 
                  : <Banknote className="w-5 h-5 text-green-600" />
                }
                <span className="capitalize font-medium">{order.payment_method}</span>
              </div>
            )}
            
            {order.comentarios_generales && (
              <div className="flex items-start gap-2 text-base text-muted-foreground mt-2 pt-2 border-t border-border">
                <MessageSquare className="w-5 h-5 mt-0.5" />
                <span>{order.comentarios_generales}</span>
              </div>
            )}
          </div>
          
          {/* Time at the bottom */}
          <div className="flex items-center justify-end gap-1.5 text-muted-foreground text-sm">
            <Clock className="w-4 h-4" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </Card>
    </div>;
}