import { Order, OrderStatus } from "@/types/order";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, ChevronDown, ChevronLeft, MapPin, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { useSwipeable } from "react-swipeable";

interface OrderCardProps {
  order: Order;
  onMoveNext: (order: Order) => void;
  onMovePrev: (order: Order) => void;
  canMoveNext: boolean;
  canMovePrev: boolean;
}

const statusConfig: Record<OrderStatus, { next: OrderStatus | null; label: string }> = {
  entrante: { next: 'preparacion', label: 'Preparar' },
  preparacion: { next: 'retirar', label: 'Listo' },
  retirar: { next: 'enviar', label: 'Enviar' },
  enviar: { next: 'terminadas', label: 'Terminar' },
  terminadas: { next: null, label: '' },
};

export function OrderCard({ order, onMoveNext, onMovePrev, canMoveNext, canMovePrev }: OrderCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const config = statusConfig[order.status];
  const timeAgo = formatDistanceToNow(new Date(order.created_at), { 
    addSuffix: true, 
    locale: es 
  });

  const itemsSummary = order.items.map(i => `${i.cantidad}x ${i.item}`).join(', ');

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (isOpen) return;
      const newOffset = e.deltaX;
      // Limit swipe based on direction availability
      if ((newOffset > 0 && !canMoveNext) || (newOffset < 0 && !canMovePrev)) {
        setSwipeOffset(newOffset * 0.2); // Resistance effect
      } else {
        setSwipeOffset(newOffset);
      }
      setIsSwiping(true);
    },
    onSwipedLeft: () => {
      if (isOpen) return;
      if (canMovePrev && swipeOffset < -60) {
        onMovePrev(order);
      }
      setSwipeOffset(0);
      setIsSwiping(false);
    },
    onSwipedRight: () => {
      if (isOpen) return;
      if (canMoveNext && swipeOffset > 60) {
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
  });

  const getSwipeIndicator = () => {
    if (!isSwiping) return null;
    if (swipeOffset > 30 && canMoveNext) {
      return (
        <div className="absolute inset-y-0 left-0 w-12 bg-success/20 flex items-center justify-center rounded-l-lg">
          <ChevronRight className="w-5 h-5 text-success" />
        </div>
      );
    }
    if (swipeOffset < -30 && canMovePrev) {
      return (
        <div className="absolute inset-y-0 right-0 w-12 bg-warning/20 flex items-center justify-center rounded-r-lg">
          <ChevronLeft className="w-5 h-5 text-warning" />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative mb-3" {...handlers}>
      {getSwipeIndicator()}
      <Card 
        className="animate-fade-in hover:shadow-md overflow-hidden"
        style={{ 
          transform: `translateX(${swipeOffset * 0.5}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="w-full text-left p-4 cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="w-3.5 h-3.5" />
                <span>{timeAgo}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  ${order.total.toLocaleString('es-CL')}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
            <p className="text-sm text-foreground truncate">{itemsSummary}</p>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-secondary/50 rounded-lg p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                        {item.cantidad}
                      </span>
                      <span className="font-semibold text-foreground">{item.item}</span>
                    </div>
                    {item.descripcion && (
                      <p className="text-sm text-muted-foreground mt-1 ml-8">
                        {item.descripcion}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="font-medium">{order.lugar_entrega}</span>
              </div>

              {order.comentarios_generales && (
                <div className="flex items-start gap-2 text-sm bg-accent/50 p-2.5 rounded-lg">
                  <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span className="text-foreground">{order.comentarios_generales}</span>
                </div>
              )}

              <div className="flex gap-2">
                {canMovePrev && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMovePrev(order);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atrás
                  </Button>
                )}
                {canMoveNext && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveNext(order);
                    }}
                    className="flex-1"
                    size="sm"
                  >
                    {config.label}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}