import { OrderColumn } from "@/components/OrderColumn";
import { OrderHistory } from "@/components/OrderHistory";
import { useOrders } from "@/hooks/useOrders";
import { Order, OrderStatus } from "@/types/order";
import { Loader2 } from "lucide-react";
import tappealoLogo from "@/assets/tappealo-logo.png";

const columns: { title: string; status: OrderStatus }[] = [
  { title: "Pedido Entrante", status: "entrante" },
  { title: "En Preparación", status: "preparacion" },
  { title: "Para Retirar", status: "retirar" },
  { title: "Para Enviar", status: "enviar" },
  { title: "Terminadas", status: "terminadas" },
];

const statusFlow: OrderStatus[] = ['entrante', 'preparacion', 'retirar', 'enviar', 'terminadas'];

const Index = () => {
  const { loading, getOrdersByStatus, getOrdersByDate, getAvailableDates, updateOrderStatus } = useOrders();

  const handleMoveNext = (order: Order) => {
    const currentIndex = statusFlow.indexOf(order.status);
    if (currentIndex < statusFlow.length - 1) {
      updateOrderStatus(order, statusFlow[currentIndex + 1]);
    }
  };

  const handleMovePrev = (order: Order) => {
    const currentIndex = statusFlow.indexOf(order.status);
    if (currentIndex > 0) {
      updateOrderStatus(order, statusFlow[currentIndex - 1]);
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
        <img src={tappealoLogo} alt="Tappealo" className="h-12" />
      </header>

      {/* Subheader */}
      <div className="px-6 py-4 bg-background">
        <h1 className="text-2xl font-bold text-foreground">Comandas</h1>
        <p className="text-muted-foreground">Panel de Gestión de Pedidos</p>
      </div>

      {/* Columns */}
      <main className="px-6 pb-6">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(({ title, status }, index) => (
            <OrderColumn
              key={status}
              title={title}
              status={status}
              orders={getOrdersByStatus(status)}
              onMoveNext={handleMoveNext}
              onMovePrev={handleMovePrev}
              canMoveNext={index < columns.length - 1}
              canMovePrev={index > 0}
            />
          ))}
        </div>

        {/* Order History */}
        <OrderHistory 
          availableDates={getAvailableDates()} 
          getOrdersByDate={getOrdersByDate} 
        />
      </main>
    </div>
  );
};

export default Index;