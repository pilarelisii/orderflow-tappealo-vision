import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import tappealoLogo from "@/assets/tappealo-logo.png";

const QRSettings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue } = useAuth();
  const [serviceActive, setServiceActive] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchServiceStatus = async () => {
      if (!venue?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('service_active')
          .eq('id', venue.id)
          .single();

        if (error) throw error;
        setServiceActive(data.service_active);
      } catch (error) {
        console.error('Error fetching service status:', error);
        toast.error('Error al cargar el estado del servicio');
      } finally {
        setLoading(false);
      }
    };

    if (venue?.id) {
      fetchServiceStatus();
    }
  }, [venue?.id]);

  const handleToggleService = async (checked: boolean) => {
    if (!venue?.id) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({ service_active: checked })
        .eq('id', venue.id);

      if (error) throw error;

      setServiceActive(checked);
      toast.success(checked ? 'Servicio activado' : 'Servicio desactivado');
    } catch (error) {
      console.error('Error updating service status:', error);
      toast.error('Error al actualizar el estado del servicio');
    } finally {
      setUpdating(false);
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
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <img src={tappealoLogo} alt="Tappealo" className="h-10" />
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <QrCode className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuración de QRs</h1>
            <p className="text-muted-foreground">Controla el estado del servicio del menú</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="service-toggle" className="text-base font-medium">
                Servicio Activo
              </Label>
              <p className="text-sm text-muted-foreground">
                {serviceActive 
                  ? "El menú está disponible para recibir pedidos" 
                  : "El menú está cerrado, no se pueden realizar pedidos"}
              </p>
            </div>
            <Switch
              id="service-toggle"
              checked={serviceActive}
              onCheckedChange={handleToggleService}
              disabled={updating}
            />
          </div>

          {!serviceActive && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ El local está cerrado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Los clientes que escaneen el QR verán que el servicio no está disponible y no podrán realizar pedidos.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default QRSettings;
