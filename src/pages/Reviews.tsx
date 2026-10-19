import { useMemo, useState } from "react";
import { Loader2, MessageSquare, Star, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import PanelPage from "@/components/PanelPage";
import StarRating from "@/components/StarRating";
import { useReviews } from "@/hooks/useReviews";
import { useVenueSettings } from "@/hooks/useVenueSettings";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });

const Reviews = () => {
  const { reviews, dishes, overall, loading } = useReviews();
  const { settings, loading: settingsLoading, updateSettings } = useVenueSettings();
  const [dishFilter, setDishFilter] = useState<string | null>(null);
  const [onlyComments, setOnlyComments] = useState(false);

  const visible = useMemo(
    () =>
      reviews.filter(
        (r) => (!dishFilter || r.product_id === dishFilter) && (!onlyComments || Boolean(r.comment))
      ),
    [reviews, dishFilter, onlyComments]
  );

  const distribution = [5, 4, 3, 2, 1].map((n) => ({
    stars: n,
    count: reviews.filter((r) => r.stars === n).length,
  }));

  const toggleShow = async (v: boolean) => {
    try {
      await updateSettings({ show_ratings: v });
      toast.success(v ? "Las calificaciones se muestran en el menú" : "Calificaciones ocultas en el menú");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar la configuración");
    }
  };

  return (
    <PanelPage title="Opiniones" subtitle="Lo que opinan tus clientes de tus platos">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-foreground">Mostrar calificaciones en el menú</p>
              <p className="text-xs text-muted-foreground">
                Cada plato muestra su promedio de estrellas. Al entregar un pedido, el cliente puede opinar.
              </p>
            </div>
            <Switch checked={settings.show_ratings} disabled={settingsLoading} onCheckedChange={toggleShow} />
          </div>

          {reviews.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <Star className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Todavía no hay opiniones. Aparecen cuando un cliente califica un pedido entregado.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-lg p-5">
                  <p className="text-sm text-muted-foreground">Promedio general</p>
                  <div className="flex items-end gap-2 mt-1">
                    <p className="text-4xl font-bold text-foreground">{overall.toFixed(1)}</p>
                    <p className="text-muted-foreground mb-1">/ 5</p>
                  </div>
                  <StarRating value={overall} size={18} />
                  <p className="text-xs text-muted-foreground mt-2">{reviews.length} opiniones</p>
                </div>

                <div className="bg-card border border-border rounded-lg p-5 md:col-span-2 space-y-1.5">
                  {distribution.map(({ stars, count }) => (
                    <div key={stars} className="flex items-center gap-3 text-sm">
                      <span className="w-6 text-muted-foreground">{stars}★</span>
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${(count / reviews.length) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Por plato */}
                <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
                  <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5 text-primary" />
                    Por plato
                  </h2>
                  <div className="divide-y divide-border">
                    <button
                      onClick={() => setDishFilter(null)}
                      className={`w-full text-left py-2 px-2 rounded-md text-sm ${
                        !dishFilter ? "bg-muted font-medium" : "hover:bg-muted/50"
                      }`}
                    >
                      Todos los platos
                    </button>
                    {dishes.map((d) => (
                      <button
                        key={d.product_id}
                        onClick={() => setDishFilter(d.product_id)}
                        className={`w-full text-left py-2 px-2 rounded-md flex items-center justify-between gap-3 ${
                          dishFilter === d.product_id ? "bg-muted" : "hover:bg-muted/50"
                        }`}
                      >
                        <span className="truncate text-sm font-medium">{d.product_name}</span>
                        <span className="flex items-center gap-2 shrink-0 text-sm">
                          <span className="font-semibold">{d.avg.toFixed(1)}</span>
                          <StarRating value={d.avg} size={12} />
                          <span className="text-xs text-muted-foreground">({d.count})</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comentarios */}
                <div className="lg:col-span-3 bg-card border border-border rounded-lg p-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Opiniones
                    </h2>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Switch checked={onlyComments} onCheckedChange={setOnlyComments} />
                      Solo con comentario
                    </label>
                  </div>

                  {visible.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No hay opiniones con ese filtro.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {visible.slice(0, 200).map((r) => (
                        <div key={r.id} className="py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <StarRating value={r.stars} />
                              <span className="text-sm font-medium truncate">{r.product_name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{fmtDate(r.created_at)}</span>
                          </div>
                          {r.comment && <p className="text-sm text-foreground mt-1">“{r.comment}”</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {r.customer_name ? `${r.customer_name} · ` : ""}Pedido #{r.ref_order_id ?? r.order_id}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </PanelPage>
  );
};

export default Reviews;
