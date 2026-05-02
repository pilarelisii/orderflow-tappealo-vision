import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { OrderColumn } from "@/components/OrderColumn";
import { OrderHistory } from "@/components/OrderHistory";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus } from "@/types/order";
import {
	Loader2,
	Settings,
	LogOut,
	Package,
	ChevronRight,
	QrCode,
	Store,
	Printer,
	Tag,
	Book
} from "lucide-react";
import tappealoLogo from "@/assets/tappealo-logo.png";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import Notifications from "@/components/Notifications";
import FullScreenLoader from "@/components/FullScreenLoader";


const columns: { title: string; status: OrderStatus }[] = [
	{ title: "Pedido Entrante", status: "entrante" },
	{ title: "En Preparación", status: "preparacion" },
	{ title: "Para Retirar", status: "retirar" },
	{ title: "Para Enviar", status: "enviar" },
	{ title: "Terminadas", status: "terminadas" },
];

const statusFlow: OrderStatus[] = [
	"entrante",
	"preparacion",
	"retirar",
	"enviar",
	"terminadas",
];



const CommerceHome = () => {
	const navigate = useNavigate();
	const { isAuthenticated, loading: authLoading, venue, signOut } = useAuth();

	// ✅ Importante: el hook se puede llamar igual; pero el render lo gateamos
	const {
		loading: ordersLoading,
		getOrdersByStatus,
		getOrdersByDate,
		getAvailableDates,
		updateOrderStatus,
	} = useOrders();

	useEffect(() => {
		if (!authLoading && !isAuthenticated) {
			navigate("/login");
		}
	}, [authLoading, isAuthenticated, navigate]);

	const handleLogout = async () => {
		const { error } = await signOut();
		if (error) {
			toast.error("Error al cerrar sesión")
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

	// ✅ 1) Primero resolvé auth
	if (authLoading) return <FullScreenLoader />;

	// ✅ 2) Si no está autenticado, no muestres nada (o redirect ya corrió)
	if (!isAuthenticated) return null;

	// ✅ 3) Ya está autenticado, pero todavía no llegó venue (evita “doble loading”)
	if (!venue?.id) return <FullScreenLoader />;

	// ✅ 4) Ahora sí: loading de orders (1 sola vez)
	if (ordersLoading) return <FullScreenLoader />;

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<img src={tappealoLogo} alt="Tappealo" className="w-16" />
					<div className="border-l border-border pl-4">
						<p className="font-semibold text-foreground">{venue.name}</p>
						<p className="text-xs text-muted-foreground">/{venue.slug}</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{venue?.enabled === true && (
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="ghost" size="icon">
									<Settings className="h-5 w-5" />
								</Button>
							</SheetTrigger>
							<SheetContent side="right" className="w-72">
								<SheetHeader>
									<SheetTitle>Configuración</SheetTitle>
								</SheetHeader>
								<nav className="mt-6 flex flex-col gap-2">
									<Link
										to="/panel/stock"
										className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
									>
										<div className="flex items-center gap-3">
											<Package className="h-5 w-5 text-muted-foreground" />
											<span className="font-medium">Menu</span>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</Link>

									<Link
										to="/panel/promotions"
										className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
									>
										<div className="flex items-center gap-3">
											<Tag className="h-5 w-5 text-muted-foreground" />
											<span className="font-medium">Promociones</span>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</Link>
									<Link
										to="/panel/qr-settings"
										className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
									>
										<div className="flex items-center gap-3">
											<QrCode className="h-5 w-5 text-muted-foreground" />
											<span className="font-medium">QRs</span>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</Link>
									<Link
										to="/panel/comercio-settings"
										className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
									>
										<div className="flex items-center gap-3">
											<Store className="h-5 w-5 text-muted-foreground" />
											<span className="font-medium">Comercio</span>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</Link>
									<Link
										to="/manual"
										target="_blank"
										className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
									>
										<div className="flex items-center gap-3">
											<Book className="h-5 w-5 text-muted-foreground" />
											<span className="font-medium">Manual de uso</span>
										</div>
										<ChevronRight className="h-4 w-4 text-muted-foreground" />
									</Link>
									{/* <Link
                  to="/printer-settings"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Impresora</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link> */}
								</nav>
							</SheetContent>
						</Sheet>
					)}
					<Button variant="ghost" size="icon" onClick={handleLogout}>
						<LogOut className="h-5 w-5" />
					</Button>
				</div>
			</header>
			{venue?.plan === "demo" && (
				<div className="px-6 py-4 bg-background">
					<h1 className="text-xl font-bold text-foreground opacity-80">
						Estas utilizando una demo de Tappealo
					</h1>
					<p className="text-muted-foreground text-sm">
						Tienes un limite de 5 comandas y 5 llamadas de mesa.
					</p>
				</div>
			)}
			{venue?.enabled === false && (
				<div className="px-6 py-4 bg-background flex flex-row items-center justify-between">
					<h1 className="text-2xl font-bold text-foreground">
						Tu comercio se encuentra deshabilitado
					</h1>
					<a
						href={`https://wa.me/542212021296/?text=Hola!%20soy%20${
							venue?.name || "un%20comercio"
						}%20y%20me%20gustaria%20habilitar%20mi%20comercio.`}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-2xl border border-[#5a351f] bg-[#fff7ec] px-5 py-3 text-sm font-bold text-[#5a351f] transition hover:scale-[1.03] block"
					>
						Contactar administrador
					</a>
				</div>
			)}
			{/* Subheader */}
			<div
				className={`px-6 py-4 bg-background ${
					venue?.enabled === false ? "hidden" : ""
				}`}
			>
				<h1 className="text-2xl font-bold text-foreground">Comandas</h1>
				<p className="text-muted-foreground">Panel de Gestión de Pedidos</p>
			</div>

			{/* Columns */}
			{venue?.enabled === true && (
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
								venueName={venue.name}
							/>
						))}
					</div>
					<div className="w-full flex md:flex-row flex-col justify-between gap-14">
						<Notifications />
						<OrderHistory
							availableDates={getAvailableDates()}
							getOrdersByDate={getOrdersByDate}
						/>
					</div>
				</main>
			)}
		</div>
	);
};

export default CommerceHome;
