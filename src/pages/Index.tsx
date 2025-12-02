import { OrderColumn } from "@/components/OrderColumn";
import { useOrders } from "@/hooks/useOrders";
import { Order, OrderStatus } from "@/types/order";
import { Loader2, Coffee } from "lucide-react";

const columns: { title: string; status: OrderStatus }[] = [
  { title: "Pedido Entrante", status: "entrante" },
  { title: "En Preparación", status: "preparacion" },
  { title: "Para Retirar", status: "retirar" },
  { title: "Para Enviar", status: "enviar" },
];

const statusFlow: Record<OrderStatus, OrderStatus | null> = {
  entrante: 'preparacion',
  preparacion: 'retirar',
  retirar: 'enviar',
  enviar: null,
};

const Index = () => {
  const { loading, getOrdersByStatus, updateOrderStatus } = useOrders();

  const handleMoveNext = (order: Order) => {
    const nextStatus = statusFlow[order.status];
    if (nextStatus) {
      updateOrderStatus(order, nextStatus);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Coffee className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Comandas</h1>
            <p className="text-sm text-muted-foreground">Panel de gestión de pedidos</p>
          </div>
        </div>
      </header>

      {/* Columns */}
      <main className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(({ title, status }) => (
            <OrderColumn
              key={status}
              title={title}
              status={status}
              orders={getOrdersByStatus(status)}
              onMoveNext={handleMoveNext}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
