import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { OrderColumn } from "@/components/OrderColumn";
import { OrderHistory } from "@/components/OrderHistory";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus } from "@/types/order";
import { Loader2, Settings, LogOut } from "lucide-react";
import tappealoLogo from "@/assets/tappealo-logo.png";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const columns: { title: string; status: OrderStatus }[] = [
  { title: "Pedido Entrante", status: "entrante" },
  { title: "En Preparación", status: "preparacion" },
  { title: "Para Retirar", status: "retirar" },
  { title: "Para Enviar", status: "enviar" },
  { title: "Terminadas", status: "terminadas" },
];

const statusFlow: OrderStatus[] = ['entrante', 'preparacion', 'retirar', 'enviar', 'terminadas'];

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue, signOut } = useAuth();
  const { loading, getOrdersByStatus, getOrdersByDate, getAvailableDates, updateOrderStatus } = useOrders();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error("Error al cerrar sesión");
    } else {
      navigate("/login");
    }
  };

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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={tappealoLogo} alt="Tappealo" className="h-10" />
          {venue && (
            <div className="border-l border-border pl-4">
              <p className="font-semibold text-foreground">{venue.name}</p>
              <p className="text-xs text-muted-foreground">/{venue.slug}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/stock">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
          
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
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
