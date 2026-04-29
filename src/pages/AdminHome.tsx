import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
	Loader2,
	LogOut,
	Plus,
	Store,
	Pencil,
	BarChart3,
	Power,
	Ban,
} from "lucide-react";

import tappealoLogo from "@/assets/tappealo-logo.png";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import {
	useAdminVenues,
	VenuePlan,
	AdminVenueRow,
} from "@/hooks/useAdminVenues";
import { toast } from "sonner";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

function normSlugClient(s: string) {
	return s
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "")
		.replace(/--+/g, "-");
}

function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
}: {
	title: string;
	value: number;
	subtitle?: string;
	icon: React.ElementType;
}) {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm text-muted-foreground">{title}</p>
					<p className="text-2xl font-bold text-foreground mt-1">{value}</p>
					{subtitle ? (
						<p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
					) : null}
				</div>

				<div className="rounded-lg bg-muted p-2">
					<Icon className="h-5 w-5 text-primary" />
				</div>
			</div>
		</div>
	);
}

function PlanBadge({ plan }: { plan: VenuePlan | null }) {
	const styles =
		plan === "premium"
			? "bg-purple-100 text-purple-700"
			: plan === "pro"
			? "bg-blue-100 text-blue-700"
			: plan === "basico"
			? "bg-green-100 text-green-700"
			: plan === "trial"
			? "bg-yellow-100 text-yellow-700"
			: plan === "demo"
			? "bg-orange-100 text-orange-700"
			: "bg-muted text-muted-foreground";

	const label =
		plan === "premium"
			? "Premium"
			: plan === "pro"
			? "Pro"
			: plan === "basico"
			? "Básico" 
			: plan === "trial"
			? "Prueba"
			: plan === "demo"
			? "Demo"
			: "Sin plan" 

	return (
		<span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
			{label}
		</span>
	);
}

export default function AdminHome() {
	const navigate = useNavigate();
	const {
		loading: adminLoading,
		isAuthenticated,
		isAdmin,
		signOut,
	} = useAdminUsers();

	const {
		venues,
		loading,
		enabledCount,
		disabledCount,
		serviceActiveCount,
		serviceInactiveCount,
		totalCount,
		planStats,
		setEnabled,
		updateVenue,
	} = useAdminVenues();

	const [updatingId, setUpdatingId] = useState<string | null>(null);

	const [editOpen, setEditOpen] = useState(false);
	const [savingEdit, setSavingEdit] = useState(false);
	const [editingVenue, setEditingVenue] = useState<AdminVenueRow | null>(null);

	const [editName, setEditName] = useState("");
	const [editEmail, setEditEmail] = useState("");
	const [editPhone, setEditPhone] = useState("");
	const [editSlug, setEditSlug] = useState("");
	const [editPlan, setEditPlan] = useState<VenuePlan>("demo");

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
	};

	const openEdit = (venue: AdminVenueRow) => {
		setEditingVenue(venue);
		setEditName(venue.name || "");
		setEditEmail(venue.email || "");
		setEditPhone(venue.phone || "");
		setEditSlug(venue.slug || "");
		setEditPlan(venue.plan || "demo");
		setEditOpen(true);
	};

	const handleSaveEdit = async () => {
		if (!editingVenue) return;

		const slug = normSlugClient(editSlug);

		if (!editName.trim()) return toast.error("Nombre obligatorio");
		if (!slug) return toast.error("Slug obligatorio");

		try {
			setSavingEdit(true);

			await updateVenue({
				venueId: editingVenue.id,
				name: editName.trim(),
				email: editEmail.trim() || null,
				phone: editPhone.trim() || null,
				slug,
				plan: editPlan,
			});

			toast.success("Comercio actualizado ✅");
			setEditOpen(false);
			setEditingVenue(null);
		} catch (e: any) {
			console.error(e);
			toast.error(e?.message || "Error actualizando comercio");
		} finally {
			setSavingEdit(false);
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<img src={tappealoLogo} alt="Tappealo" className="h-10" />
					<div className="hidden sm:block">
						<p className="text-sm text-muted-foreground">Admin</p>
						<p className="text-xs text-muted-foreground">
							Restaurantes: <span className="font-semibold">{totalCount}</span>
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

			<main className="px-6 py-8 max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<BarChart3 className="h-7 w-7 text-primary" />
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							Dashboard Admin
						</h1>
						<p className="text-muted-foreground">
							Estadísticas generales y gestión de comercios
						</p>
					</div>
				</div>

				{/* Dashboard stats */}
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
					<StatCard
						title="Total restaurantes"
						value={totalCount}
						subtitle="Todos los comercios registrados"
						icon={Store}
					/>
					<StatCard
						title="Enabled"
						value={enabledCount}
						subtitle={`Disabled: ${disabledCount}`}
						icon={Power}
					/>
					<StatCard
						title="Servicio activo"
						value={serviceActiveCount}
						subtitle={`Inactivos: ${serviceInactiveCount}`}
						icon={BarChart3}
					/>
					<StatCard
						title="Plan Premium"
						value={planStats.premium}
						subtitle={`Pro: ${planStats.pro} · Básico: ${planStats.basico}`}
						icon={Ban}
					/>
				</div>

				<div className="grid gap-4 md:grid-cols-4 mb-8">
					<StatCard title="Plan Básico" value={planStats.basico} icon={Store} />
					<StatCard title="Plan Pro" value={planStats.pro} icon={Store} />
					<StatCard
						title="Plan Premium"
						value={planStats.premium}
						icon={Store}
					/>
					<StatCard title="Sin plan" value={planStats.sinPlan} icon={Store} />
				</div>

				{/* Listado */}
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					<div className="grid grid-cols-12 gap-3 px-4 py-3 bg-muted/40 text-xs font-semibold text-muted-foreground">
						<div className="col-span-3">Nombre</div>
						<div className="col-span-2">Plan</div>
						<div className="col-span-2">Email</div>
						<div className="col-span-2">Teléfono</div>
						<div className="col-span-1 text-center">Enabled</div>
						<div className="col-span-2 text-right">Acciones</div>
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
									<div className="col-span-3">
										<p className="font-semibold text-foreground">
											{v.name || "—"}
										</p>
										<p className="text-xs text-muted-foreground">
											slug: {v.slug || "—"}
										</p>
									</div>

									<div className="col-span-2">
										<PlanBadge plan={v.plan} />
									</div>

									<div className="col-span-2 text-sm text-foreground truncate">
										{v.email || "—"}
									</div>

									<div className="col-span-2 text-sm text-foreground">
										{v.phone || "—"}
									</div>

									<div className="col-span-1 flex justify-center">
										<Switch
											checked={v.enabled}
											disabled={updatingId === v.id}
											onCheckedChange={(next) => handleToggle(v.id, next)}
										/>
									</div>

									<div className="col-span-2 flex justify-end">
										<Button
											variant="outline"
											size="sm"
											onClick={() => openEdit(v)}
										>
											<Pencil className="h-4 w-4 mr-2" />
											Editar
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</main>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar comercio</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 pt-2">
						<div className="space-y-2">
							<Label>Nombre</Label>
							<Input
								value={editName}
								onChange={(e) => setEditName(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Email</Label>
							<Input
								value={editEmail}
								onChange={(e) => setEditEmail(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Teléfono</Label>
							<Input
								value={editPhone}
								onChange={(e) => setEditPhone(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Slug</Label>
							<Input
								value={editSlug}
								onChange={(e) => setEditSlug(e.target.value)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Plan</Label>
							<Select
								value={editPlan}
								onValueChange={(value) => setEditPlan(value as VenuePlan)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Seleccionar plan" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="basico">Básico</SelectItem>
									<SelectItem value="pro">Pro</SelectItem>
									<SelectItem value="premium">Premium</SelectItem>
									<SelectItem value="demo">Demo</SelectItem>
									<SelectItem value="trial">Prueba</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<Button
							onClick={handleSaveEdit}
							disabled={savingEdit}
							className="w-full"
						>
							{savingEdit ? (
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
							) : null}
							Guardar cambios
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
