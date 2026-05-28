import { Order, OrderStatus } from "@/types/order";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	MapPin,
	Users,
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useQrLocationsMap } from "@/hooks/useQrLocationsMap";
import { CreditCard, Banknote } from "lucide-react";
import { useSwipeable } from "react-swipeable";

interface GroupedOrderCardProps {
	orders: Order[];
	onMoveNext: (order: Order) => void;
	onMovePrev: (order: Order) => void;
	canMoveNext: boolean;
	canMovePrev: boolean;
	venueName?: string;
}

const statusConfig: Record<OrderStatus, { label: string }> = {
	entrante: { label: "Preparar" },
	preparacion: { label: "Listo" },
	retirar: { label: "Falta pagar" },
	"falta-pagar": { label: "Terminar" },
	terminadas: { label: "" },
};

export function GroupedOrderCard({
	orders,
	onMoveNext,
	onMovePrev,
	canMoveNext,
	canMovePrev,
}: GroupedOrderCardProps) {
	const [isOpen, setIsOpen] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);
		const [isSwiping, setIsSwiping] = useState(false);
	const firstOrder = orders[0];
	const qrMap = useQrLocationsMap(firstOrder.venue_id);

	const total = orders.reduce(
		(sum, order) => sum + Number(order.total || 0),
		0
	);

	const totalItems = orders.reduce(
		(sum, order) =>
			sum +
			order.items.reduce((acc, item) => acc + Number(item.quantity || 0), 0),
		0
	);

	const timeAgo = formatDistanceToNow(new Date(firstOrder.created_at), {
		addSuffix: true,
		locale: es,
	});

	const location =
		qrMap[firstOrder.qr_location_id] ||
		firstOrder.qr_location_id ||
		"Sin ubicación";

	const handleMoveNextGroup = (e: React.MouseEvent) => {
		e.stopPropagation();

		[...orders].forEach((order) => {
			onMoveNext(order);
		});
	};

	const handleMovePrevGroup = (e: React.MouseEvent) => {
		e.stopPropagation();

		[...orders].forEach((order) => {
			onMovePrev(order);
		});
	};

 const handlers = useSwipeable({
		onSwiping: (e) => {
			const newOffset = e.deltaX;
			// Limit swipe based on direction availability
			if ((newOffset > 0 && !canMoveNext) || (newOffset < 0 && !canMovePrev)) {
				setSwipeOffset(newOffset * 0.2); // Resistance effect
			} else {
				setSwipeOffset(newOffset);
			}
			setIsSwiping(true);
		},
		onSwipedLeft: () => {
			if (canMovePrev && swipeOffset < -50) {
                orders.forEach((order) => {
                    onMovePrev(order)
                })
			}
			setSwipeOffset(0);
			setIsSwiping(false);
		},
		onSwipedRight: () => {
			if (canMoveNext && swipeOffset > 50) {
				orders.forEach((order) => {
					onMoveNext(order);
				});
			}
			setSwipeOffset(0);
			setIsSwiping(false);
		},
		onTouchEndOrOnMouseUp: () => {
			setSwipeOffset(0);
			setIsSwiping(false);
		},
		trackMouse: true,
		preventScrollOnSwipe: true,
		delta: 10,
 });

 const getSwipeIndicator = () => {
		if (!isSwiping) return null;
		if (swipeOffset > 25 && canMoveNext) {
			return (
				<div className="absolute inset-y-0 left-0 w-16 bg-success/30 flex items-center justify-center rounded-l-lg transition-all">
					<ChevronRight className="w-6 h-6 text-success" />
				</div>
			);
		}
		if (swipeOffset < -25 && canMovePrev) {
			return (
				<div className="absolute inset-y-0 right-0 w-16 bg-warning/30 flex items-center justify-center rounded-r-lg transition-all">
					<ChevronLeft className="w-6 h-6 text-warning" />
				</div>
			);
		}
		return null;
 };



	return (
		<div className="relative mb-3" {...handlers}>
			{getSwipeIndicator()}
			<Card
				className="animate-fade-in hover:shadow-md overflow-hidden"
				style={{
					transform: `translateX(${swipeOffset * 0.5}px)`,
					transition: isSwiping ? "none" : "transform 0.3s ease-out",
				}}
			>
				<Collapsible open={isOpen} onOpenChange={setIsOpen}>
					<CollapsibleTrigger className="w-full text-left p-4 cursor-pointer">
						<div className="flex items-center justify-between mb-3">
							<p className="font-semibold text-sm text-foreground">
								Mesa agrupada
							</p>

							<div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">
								<Users className="w-3.5 h-3.5" />
								{orders.length} pedidos
							</div>
						</div>

						<div className="flex items-center gap-2 mb-2 bg-primary/10 rounded-md px-2 py-1.5">
							<MapPin className="w-5 h-5 text-primary" />
							<span className="font-semibold text-primary">{location}</span>
						</div>

						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Clock className="w-3.5 h-3.5" />
								<span>{timeAgo}</span>
							</div>

							<div className="flex items-center gap-3">
								<span className="text-lg font-bold text-primary">
									${total.toLocaleString("es-AR")}
								</span>

								<ChevronDown
									className={`w-4 h-4 text-muted-foreground transition-transform ${
										isOpen ? "rotate-180" : ""
									}`}
								/>
							</div>
						</div>

						<p className="text-sm text-muted-foreground">
							{totalItems} productos en total
						</p>
					</CollapsibleTrigger>

					<CollapsibleContent>
						<div className="px-4 pb-4 space-y-4">
							{orders.map((order) => (
								<div
									key={order.id}
									className="rounded-lg border border-border bg-secondary/40 p-3"
								>
									<div className="flex items-center justify-between mb-2">
										<p className="font-semibold text-sm">
											Pedido #{order.ref_order_id}
										</p>

										<span className="font-bold text-primary">
											${Number(order.total || 0).toLocaleString("es-AR")}
										</span>
									</div>

									{order.name && (
										<p className="text-sm text-foreground mb-2">
											Cliente: {order.name}
										</p>
									)}

									<div className="space-y-1">
										{order.items.map((item, idx) => (
											<div
												key={idx}
												className="flex items-center gap-2 text-sm"
											>
												<span className="bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
													{item.quantity}
												</span>
												<span>{item.name}</span>
											</div>
										))}
									</div>

									{order.additional_comments && (
										<p className="text-sm mt-2 bg-accent/50 p-2 rounded-md">
											{order.additional_comments}
										</p>
									)}
									{order.payment_method && (
										<div className="flex items-center gap-2 mb-2 bg-accent/50 rounded-md px-2 py-1.5 mt-2">
											{order.payment_method
												.toLowerCase()
												.includes("mercado") ? (
												<CreditCard className="w-4 h-4 text-blue-500" />
											) : (
												<Banknote className="w-4 h-4 text-green-600" />
											)}
											<span className="font-medium text-foreground text-sm">
												{order.payment_method === "efectivo"
													? "Efectivo en mesa"
													: order.payment_method === "efectivo-counter"
													? "Efectivo en caja"
													: "Mercado Pago"}
											</span>
										</div>
									)}
								</div>
							))}

							<div className="flex gap-2">
								{canMovePrev && (
									<Button
										onClick={handleMovePrevGroup}
										variant="outline"
										size="sm"
										className="flex-1"
									>
										<ChevronLeft className="w-4 h-4 mr-1" />
										Atrás
									</Button>
								)}

								{canMoveNext && (
									<Button
										onClick={handleMoveNextGroup}
										size="sm"
										className="flex-1"
									>
										{statusConfig[firstOrder.status].label}
										<ChevronRight className="w-4 h-4 ml-1" />
									</Button>
								)}
							</div>
						</div>
					</CollapsibleContent>
				</Collapsible>
			</Card>
		</div>
	);
}
