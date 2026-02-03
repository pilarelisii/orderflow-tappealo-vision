import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LogOut, Plus, Store } from "lucide-react";
import tappealoLogo from "@/assets/tappealo-logo.png";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminVenues } from "@/hooks/useAdminVenues";
import { toast } from "sonner";
import { signOut } from "firebase/auth";

export default function AdminHome() {
	const navigate = useNavigate();
	const { loading: adminLoading, isAuthenticated, isAdmin, signOut } = useAdminUsers();

	const { venues, loading, enabledCount, totalCount, setEnabled } =
		useAdminVenues();

	const [updatingId, setUpdatingId] = useState<string | null>(null);

	useEffect(() => {
		if (!adminLoading && (!isAuthenticated || !isAdmin)) {
			navigate("/login-admin", { replace: true });
		}
	}, [adminLoading, isAuthenticated, isAdmin, navigate]);

	if (adminLoading || loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isAuthenticated || !isAdmin) return null;

	const handleToggle = async (venueId: string, next: boolean) => {
		try {
			setUpdatingId(venueId);
			await setEnabled(venueId, next);
			toast.success(next ? "Comercio habilitado" : "Comercio deshabilitado");
		} catch (e) {
			console.error(e);
			toast.error("No se pudo actualizar enabled");
		} finally {
			setUpdatingId(null);
		}
	};

    const handleLogout = async () => {
        await signOut();  
    }

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img src={tappealoLogo} alt="Tappealo" className="h-10" />
					<div className="hidden sm:block">
						<p className="text-sm text-muted-foreground">Admin</p>
						<p className="text-xs text-muted-foreground">
							Enabled: <span className="font-semibold">{enabledCount}</span> /{" "}
							{totalCount}
						</p>
					</div>
				</div>
                <div className="flex items-center gap-2">
                    <Button asChild>
                        <Link to="/admin/create">
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar comercio
                        </Link>
                    </Button>

                    <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
				
			</header>

			<main className="px-6 py-8 max-w-4xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<Store className="h-7 w-7 text-primary" />
					<div>
						<h1 className="text-2xl font-bold text-foreground">Comercios</h1>
						<p className="text-muted-foreground">
							Lista de usuarios/comercios y estado (enabled)
						</p>
					</div>
				</div>

				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground">
						<div className="col-span-4">Nombre</div>
						<div className="col-span-3">Email</div>
						<div className="col-span-3">Teléfono</div>
						<div className="col-span-2 text-right">Enabled</div>
					</div>

					{venues.length === 0 ? (
						<div className="p-6 text-muted-foreground">
							No hay comercios todavía.
						</div>
					) : (
						<div className="divide-y divide-border">
							{venues.map((v) => (
								<div
									key={v.id}
									className="grid grid-cols-12 gap-3 px-4 py-4 items-center"
								>
									<div className="col-span-4">
										<p className="font-semibold text-foreground">
											{v.name || "—"}
										</p>
										<p className="text-xs text-muted-foreground">
											slug: {v.slug || "—"}
										</p>
									</div>

									<div className="col-span-3 text-sm text-foreground truncate">
										{v.email || "—"}
									</div>

									<div className="col-span-3 text-sm text-foreground">
										{v.phone || "—"}
									</div>

									<div className="col-span-2 flex justify-end">
										<Switch
											checked={v.enabled}
											disabled={updatingId === v.id}
											onCheckedChange={(next) => handleToggle(v.id, next)}
										/>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
