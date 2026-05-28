import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Settings,
	Package,
	ChevronRight,
	QrCode,
	Store,
	Tag,
	Book,
	ChartColumnStacked,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Sidebar = () => {
	return (
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
						to="/panel/analytics"
						className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
					>
						<div className="flex items-center gap-3">
							<ChartColumnStacked className="h-5 w-5 text-muted-foreground" />
							<span className="font-medium">Estadísticas</span>
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
	);
};

export default Sidebar;
