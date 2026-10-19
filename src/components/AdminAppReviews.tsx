import { useEffect, useMemo, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Loader2, MessageSquare, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import StarRating from "@/components/StarRating";
import { fbFunctions } from "@/integrations/firebase/client";

type AppReview = {
  id: string;
  venue_id: string | null;
  venue_name: string | null;
  venue_slug: string | null;
  stars: number;
  comment: string | null;
  created_at: string | null;
};

/** Opiniones que dejan los clientes sobre Tappealo (solo para admins). */
export default function AdminAppReviews() {
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [onlyComments, setOnlyComments] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const fn = httpsCallable<{ limit: number }, { reviews: AppReview[] }>(fbFunctions, "adminListAppReviews");
      const res = await fn({ limit: 300 });
      setReviews(res.data.reviews ?? []);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "No se pudieron cargar las opiniones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0;
  const visible = useMemo(
    () => reviews.filter((r) => !onlyComments || Boolean(r.comment)),
    [reviews, onlyComments]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Star className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold text-foreground">Opiniones de Tappealo</h2>
            <p className="text-sm text-muted-foreground">Lo que dicen los clientes de pedir con la app</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{avg.toFixed(1)}</span>
              <StarRating value={avg} size={16} />
              <span className="text-sm text-muted-foreground">({reviews.length})</span>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={onlyComments} onCheckedChange={setOnlyComments} />
            Solo con comentario
          </label>
          <Button variant="outline" size="icon" onClick={load} disabled={loading} title="Actualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading && reviews.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Todavía no hay opiniones.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto divide-y divide-border">
          {visible.map((r) => (
            <div key={r.id} className="py-3 flex gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.stars} />
                    <span className="text-sm font-medium">{r.venue_name ?? r.venue_slug ?? "Comercio"}</span>
                  </div>
                  {r.created_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("es-AR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                {r.comment && <p className="text-sm text-foreground mt-1">“{r.comment}”</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
