import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Store, MapPin, Phone, CreditCard, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import tappealoLogo from "@/assets/tappealo-logo.png";

const ComercioSettings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue } = useAuth();
  const [loading, setLoading] = useState(true);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [venuePhone, setVenuePhone] = useState("");
  const [mpPublicKey, setMpPublicKey] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!venue?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('google_maps_url, phone, mp_public_key, mp_access_token')
          .eq('id', venue.id)
          .single();

        if (error) throw error;
        setGoogleMapsUrl(data.google_maps_url || "");
        setVenuePhone(data.phone || "");
        setMpPublicKey(data.mp_public_key || "");
        setMpAccessToken(data.mp_access_token || "");
      } catch (error) {
        console.error('Error fetching venue data:', error);
        toast.error('Error al cargar los datos del comercio');
      } finally {
        setLoading(false);
      }
    };

    if (venue?.id) {
      fetchVenueData();
    }
  }, [venue?.id]);

  const handleSave = async () => {
    if (!venue?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({ 
          google_maps_url: googleMapsUrl || null, 
          phone: venuePhone || null,
          mp_public_key: mpPublicKey || null,
          mp_access_token: mpAccessToken || null
        })
        .eq('id', venue.id);

      if (error) throw error;
      toast.success('Datos del comercio actualizados');
    } catch (error) {
      console.error('Error updating commerce data:', error);
      toast.error('Error al actualizar los datos del comercio');
    } finally {
      setSaving(false);
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
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Comercio</h1>
            <p className="text-muted-foreground">Información del local para mostrar en el menú</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-maps" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Enlace a Google Maps
              </Label>
              <Input
                id="google-maps"
                placeholder="https://maps.google.com/..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="max-w-xl"
              />
              <p className="text-xs text-muted-foreground">
                Este enlace se mostrará para que los clientes puedan encontrar el local (especialmente útil para retiro)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Celular / Teléfono
              </Label>
              <Input
                id="venue-phone"
                placeholder="+54 9 11 1234-5678"
                value={venuePhone}
                onChange={(e) => setVenuePhone(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
        </div>

        {/* Mercado Pago Integration */}
        <div className="bg-card border border-border rounded-lg p-6 mt-6">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Mercado Pago</h2>
              <p className="text-sm text-muted-foreground">Credenciales para procesar pagos</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mp-public-key">Public Key</Label>
              <Input
                id="mp-public-key"
                placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={mpPublicKey}
                onChange={(e) => setMpPublicKey(e.target.value)}
                className="max-w-xl font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp-access-token">Access Token</Label>
              <div className="relative max-w-xl">
                <Input
                  id="mp-access-token"
                  type={showAccessToken ? "text" : "password"}
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={mpAccessToken}
                  onChange={(e) => setMpAccessToken(e.target.value)}
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Encontrá tus credenciales en{" "}
                <a 
                  href="https://www.mercadopago.com.ar/developers/panel/app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Mercado Pago Developers
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ComercioSettings;
