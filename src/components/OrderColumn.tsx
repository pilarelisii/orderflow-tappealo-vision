import { Order, OrderStatus } from "@/types/order";
import { OrderCard } from "./OrderCard";
import { cn } from "@/lib/utils";

interface OrderColumnProps {
  title: string;
  status: OrderStatus;
  orders: Order[];
  onMoveNext: (order: Order) => void;
  onMovePrev: (order: Order) => void;
  canMoveNext: boolean;
  canMovePrev: boolean;
  venueName?: string;
}

const columnStyles: Record<OrderStatus, string> = {
  entrante: "border-t-column-entrante",
  preparacion: "border-t-column-preparacion",
  retirar: "border-t-column-retirar",
  enviar: "border-t-column-enviar",
  terminadas: "border-t-column-terminadas",
};

const badgeStyles: Record<OrderStatus, string> = {
  entrante: "bg-column-entrante",
  preparacion: "bg-column-preparacion",
  retirar: "bg-column-retirar",
  enviar: "bg-column-enviar",
  terminadas: "bg-column-terminadas",
};

export function OrderColumn({
  title,
  status,
  orders,
  onMoveNext,
  onMovePrev,
  canMoveNext,
  canMovePrev,
  venueName,
}: OrderColumnProps) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[280px] max-w-[350px] bg-card rounded-xl border-t-4 shadow-sm",
        columnStyles[status]
      )}
    >
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">{title}</h2>
          <span
            className={cn(
              "text-sm font-bold px-2.5 py-1 rounded-full text-primary-foreground",
              badgeStyles[status]
            )}
          >
            {orders.length}
          </span>
        </div>

        {status === "terminadas" && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-sm font-medium text-muted-foreground">
              Total Facturado Hoy
            </span>
            <span className="text-lg font-bold text-foreground">
              $
              {orders
                .reduce((sum, order) => sum + Number(order.total || 0), 0)
                .toLocaleString("es-AR")}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Sin pedidos</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onMoveNext={onMoveNext}
              onMovePrev={onMovePrev}
              canMoveNext={canMoveNext}
              canMovePrev={canMovePrev}
              venueName={venueName}
            />
          ))
        )}
      </div>
    </div>
  );
}