import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { StockManagement } from "@/components/StockManagement";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import tappealoLogo from "@/assets/tappealo-logo.png";
import PromosManagement from "@/components/PromosManagement";
import FullScreenLoader from "@/components/FullScreenLoader";

const Promotions = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) {
    return (
      <FullScreenLoader />
    );
  }


  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/panel">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <img src={tappealoLogo} alt="Tappealo" className="w-16" />

          {venue && (
            <div className="border-l border-border pl-4">
              <p className="font-semibold text-foreground">{venue.name}</p>
              <p className="text-xs text-muted-foreground">/{venue.slug}</p>
            </div>
          )}
        </div>
      </header>

      <main className="px-6 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Productos en promocion
        </h1>
        <PromosManagement />
      </main>
    </div>
  );
};

export default Promotions;