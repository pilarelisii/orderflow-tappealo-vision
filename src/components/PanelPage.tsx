import { ReactNode, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import tappealoLogo from "@/assets/tappealo-logo.png";
import FullScreenLoader from "@/components/FullScreenLoader";

type Props = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

/** Layout común de las páginas de configuración del panel (header + auth). */
export default function PanelPage({ title, subtitle, actions, children }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading) return <FullScreenLoader />;
  if (!isAuthenticated) return null;
  if (!venue?.id) return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/panel">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <img src={tappealoLogo} alt="Tappealo" className="w-16" />

          <div className="border-l border-border pl-4">
            <p className="font-semibold text-foreground">{venue.name}</p>
            <p className="text-xs text-muted-foreground">/{venue.slug}</p>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
