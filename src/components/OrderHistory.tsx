import React, { useMemo, useState } from "react";
import { Order } from "@/types/order";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Calendar, Package } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useQrLocationsMap } from "@/hooks/useQrLocationsMap";

interface OrderHistoryProps {
  availableDates: string[];
  getOrdersByDate: (date: Date) => Order[];
}

export function OrderHistory({ availableDates, getOrdersByDate }: OrderHistoryProps) {
  const [openDates, setOpenDates] = useState<Set<string>>(new Set());

  const toggleDate = (dateStr: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  // ✅ Derivamos un venueId UNA VEZ (sin hooks dentro de loops)
  const venueId = useMemo(() => {
    // intentamos sacar venue_id del primer día que tenga pedidos
    for (const dateStr of availableDates) {
      const date = new Date(dateStr + "T12:00:00");
      const orders = getOrdersByDate(date);
      const vid = orders?.[0]?.venue_id;
      if (vid) return String(vid);
    }
    return "";
  }, [availableDates, getOrdersByDate]);

  // ✅ Hook llamado una sola vez, arriba y siempre
  const qrMap = useQrLocationsMap(venueId);

  // ✅ Render condicional DESPUÉS de hooks
  if (availableDates.length === 0) return null;

  return (
    <div className="mt-6 flex-1">
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Historial de Pedidos
      </h2>

      <div className="space-y-3">
        {availableDates.map((dateStr) => {
          const date = new Date(dateStr + "T12:00:00");
          const orders = getOrdersByDate(date);
          const isOpen = openDates.has(dateStr);

          const formattedDate = format(date, "EEEE d 'de' MMMM, yyyy", {
            locale: es,
          });

          return (
            <Card key={dateStr} className="overflow-hidden">
              <Collapsible open={isOpen} onOpenChange={() => toggleDate(dateStr)}>
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground capitalize">
                        {formattedDate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {orders.length} pedido{orders.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">
                      $
                      {orders
                        .reduce((sum, o) => sum + Number(o.total || 0), 0)
                        .toLocaleString("es-AR")}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-muted-foreground transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border p-4 space-y-3 bg-secondary/20">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-card rounded-lg p-3 border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            #{order.ref_order_id ?? order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="font-semibold text-primary">
                            ${Number(order.total || 0).toLocaleString("es-AR")}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-foreground">
                          {qrMap?.[order.qr_location_id] ||
                            order.qr_location_id ||
                            "Sin ubicación"}
                        </p>

                        <p className="text-sm text-muted-foreground mt-1">
                          {order.items
                            .map((i) => `${i.quantity}x ${i.name}`)
                            .join(", ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}