import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	AlertCircle,
	BarChart3,
	ChefHat,
	Clock3,
	DollarSign,
	LogOut,
	ShoppingBag,
	Star,
	Table2,
	Users,
    ArrowLeft
} from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import tappealoLogo from "@/assets/tappealo-logo.png";
import Sidebar from "@/components/Sidebar";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
	useRestaurantAnalytics,
	type AnalyticsRange,
} from "@/hooks/useRestaurantAnalytics";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { toast } from "sonner";
import { useQrLocationsMap } from "@/hooks/useQrLocationsMap";

const rangeOptions: { label: string; value: AnalyticsRange }[] = [
	{ label: "Hoy", value: "today" },
	{ label: "7 días", value: "7d" },
	{ label: "30 días", value: "30d" },
];

const StatCard = ({
	title,
	value,
	description,
	icon: Icon,
}: {
	title: string;
	value: string;
	description: string;
	icon: any;
}) => {
	return (
		<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-sm font-medium text-muted-foreground">{title}</p>

					<h3 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
						{value}
					</h3>

					<p className="mt-1 text-xs text-muted-foreground">{description}</p>
				</div>

				<div className="rounded-xl bg-primary/10 p-3 text-primary">
					<Icon className="h-5 w-5" />
				</div>
			</div>
		</div>
	);
};

const EmptyState = ({ title, text }: { title: string; text: string }) => {
	return (
		<div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background p-6 text-center">
			<BarChart3 className="mb-3 h-8 w-8 text-muted-foreground" />
			<p className="font-semibold text-foreground">{title}</p>
			<p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
		</div>
	);
};

const DashboardAnalytics = () => {
	const navigate = useNavigate();
	const { isAuthenticated, loading: authLoading, venue, signOut } = useAuth();
    const qrMap = useQrLocationsMap(venue?.id);
	const [range, setRange] = useState<AnalyticsRange>("7d");

	const {
		data,
		loading: analyticsLoading,
		error,
	} = useRestaurantAnalytics(range);

	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			navigate("/login");
		}
	}, [authLoading, isAuthenticated, navigate]);


	if (authLoading) return <FullScreenLoader />;

	if (!isAuthenticated) return null;

	if (!venue?.id) return <FullScreenLoader />;

	if (analyticsLoading) return <FullScreenLoader />;

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
				</div>
			</header>

			{venue?.plan === "demo" && (
				<div className="bg-background px-6 py-4">
					<h1 className="text-xl font-bold text-foreground opacity-80">
						Estás utilizando una demo de Tappealo
					</h1>

					<p className="text-sm text-muted-foreground">
						Tienes un límite de 5 comandas y 5 llamadas de mesa.
					</p>
				</div>
			)}

			{venue?.enabled === false && (
				<div className="flex flex-col gap-4 bg-background px-6 py-4 md:flex-row md:items-center md:justify-between">
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							Tu comercio se encuentra deshabilitado
						</h1>

						<p className="text-sm text-muted-foreground">
							Para ver estadísticas necesitás tener el comercio habilitado.
						</p>
					</div>

					<a
						href={`https://wa.me/542212021296/?text=Hola!%20soy%20${
							venue?.name || "un%20comercio"
						}%20y%20me%20gustaria%20habilitar%20mi%20comercio.`}
						target="_blank"
						rel="noopener noreferrer"
						className="block rounded-2xl border border-[#5a351f] bg-[#fff7ec] px-5 py-3 text-sm font-bold text-[#5a351f] transition hover:scale-[1.03]"
					>
						Contactar administrador
					</a>
				</div>
			)}

			{venue?.enabled === true && (
				<main className="space-y-6 px-6 py-6">
					<div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
						<div>
							<h1 className="text-2xl font-bold text-foreground">
								Estadísticas
							</h1>

							<p className="text-sm text-muted-foreground">
								Analizá ventas, pedidos, mesas y rendimiento del restaurante.
							</p>
						</div>

						<div className="flex rounded-xl border border-border bg-card p-1">
							{rangeOptions.map((option) => (
								<button
									key={option.value}
									onClick={() => setRange(option.value)}
									className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
										range === option.value
											? "bg-primary text-primary-foreground shadow-sm"
											: "text-muted-foreground hover:bg-muted"
									}`}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>

					{error && (
						<div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
							<div className="flex items-center gap-2">
								<AlertCircle className="h-5 w-5" />
								<p className="font-medium">{error}</p>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						<StatCard
							title="Facturación"
							value={formatCurrency(data.totalRevenue)}
							description="Total generado por pedidos"
							icon={DollarSign}
						/>

						<StatCard
							title="Pedidos"
							value={formatNumber(data.totalOrders)}
							description="Pedidos recibidos"
							icon={ShoppingBag}
						/>

						<StatCard
							title="Ticket promedio"
							value={formatCurrency(data.averageTicket)}
							description="Promedio por pedido"
							icon={Users}
						/>
					</div>

					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<div className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
							<div className="mb-5">
								<h2 className="text-lg font-semibold text-foreground">
									Ventas
								</h2>

								<p className="text-sm text-muted-foreground">
									Evolución de facturación del restaurante.
								</p>
							</div>

							{data.revenueByDay.length === 0 ? (
								<EmptyState
									title="Todavía no hay ventas"
									text="Cuando empiecen a ingresar pedidos, vas a ver acá la evolución de facturación."
								/>
							) : (
								<div className="h-[320px]">
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={data.revenueByDay}>
											<CartesianGrid
												strokeDasharray="3 3"
												className="stroke-muted"
											/>
											<XAxis dataKey="label" />
											<YAxis />
											<Tooltip
												formatter={(value: any) =>
													formatCurrency(Number(value))
												}
											/>
											<Area
												type="monotone"
												dataKey="revenue"
												stroke="hsl(var(--primary))"
												fill="hsl(var(--primary))"
												fillOpacity={0.15}
												strokeWidth={3}
												name="Facturación"
											/>
										</AreaChart>
									</ResponsiveContainer>
								</div>
							)}
						</div>

						<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
							<div className="mb-5">
								<h2 className="text-lg font-semibold text-foreground">
									Estado de pedidos
								</h2>

								<p className="text-sm text-muted-foreground">
									Distribución de comandas.
								</p>
							</div>

							{data.ordersByStatus.length === 0 ? (
								<EmptyState
									title="Sin comandas"
									text="Todavía no hay pedidos para mostrar en este período."
								/>
							) : (
								<div className="h-[320px]">
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={data.ordersByStatus}>
											<CartesianGrid
												strokeDasharray="3 3"
												className="stroke-muted"
											/>
											<XAxis dataKey="status" />
											<YAxis />
											<Tooltip />
											<Bar
												dataKey="total"
												fill="hsl(var(--primary))"
												radius={[8, 8, 0, 0]}
												name="Pedidos"
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							)}
						</div>
					</div>

					<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
						<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
							<div className="mb-5 flex items-center gap-2">
								<Star className="h-5 w-5 text-primary" />

								<div>
									<h2 className="text-lg font-semibold text-foreground">
										Productos más vendidos
									</h2>

									<p className="text-sm text-muted-foreground">
										Platos con mayor rotación.
									</p>
								</div>
							</div>

							<div className="space-y-3">
								{data.topProducts.length === 0 ? (
									<EmptyState
										title="Sin productos vendidos"
										text="Cuando haya pedidos, vas a ver el ranking de productos."
									/>
								) : (
									data.topProducts.map((product, index) => (
										<div
											key={product.id}
											className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
										>
											<div className="flex items-center gap-3">
												<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
													{index + 1}
												</div>

												<div>
													<p className="font-medium text-foreground">
														{product.name}
													</p>

													<p className="text-sm text-muted-foreground">
														{product.quantity} unidades vendidas
													</p>
												</div>
											</div>

											<p className="font-semibold text-foreground">
												{formatCurrency(product.revenue)}
											</p>
										</div>
									))
								)}
							</div>
						</div>

						<div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
							<div className="mb-5 flex items-center gap-2">
								<Table2 className="h-5 w-5 text-primary" />

								<div>
									<h2 className="text-lg font-semibold text-foreground">
										Mesas con más consumo
									</h2>

									<p className="text-sm text-muted-foreground">
										Detectá las zonas más activas del local.
									</p>
								</div>
							</div>

							<div className="space-y-3">
								{data.topTables.length === 0 ? (
									<EmptyState
										title="Sin consumo por mesa"
										text="Cuando ingresen pedidos desde QR, vas a ver qué mesas venden más."
									/>
								) : (
									data.topTables.map((table) => (
										<div
											key={table.id}
											className="flex items-center justify-between rounded-xl border border-border bg-background p-4"
										>
											<div>
												<p className="font-medium text-foreground">
													{qrMap[table.name]}
												</p>

												<p className="text-sm text-muted-foreground">
													{table.orders} pedidos
												</p>
											</div>

											<p className="font-semibold text-foreground">
												{formatCurrency(table.revenue)}
											</p>
										</div>
									))
								)}
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<StatCard
							title="Pedidos completados"
							value={formatNumber(data.completedOrders)}
							description="Comandas terminadas"
							icon={ChefHat}
						/>

						<StatCard
							title="Pedidos cancelados"
							value={formatNumber(data.cancelledOrders)}
							description="Comandas canceladas"
							icon={AlertCircle}
						/>

						<StatCard
							title="Mesas activas"
							value={formatNumber(data.activeTables)}
							description="Mesas con pedidos en el período"
							icon={Table2}
						/>
					</div>
				</main>
			)}
		</div>
	);
};

export default DashboardAnalytics;
