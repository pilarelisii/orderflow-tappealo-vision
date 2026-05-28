// hooks/useRestaurantAnalytics.ts
import { useMemo } from "react";
import { Order } from "@/types/order";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";

export type AnalyticsRange = "today" | "7d" | "30d";

export interface RestaurantAnalytics {
	totalRevenue: number;
	totalOrders: number;
	averageTicket: number;
	activeTables: number;
	avgPreparationTime: number;
	completedOrders: number;
	cancelledOrders: number;
	revenueByDay: {
		label: string;
		revenue: number;
		orders: number;
	}[];
	ordersByStatus: {
		status: string;
		total: number;
	}[];
	topProducts: {
		id: string;
		name: string;
		quantity: number;
		revenue: number;
	}[];
	topTables: {
		id: string;
		name: string;
		orders: number;
		revenue: number;
	}[];
}

const statusLabels: Record<string, string> = {
	entrante: "Entrantes",
	preparacion: "Preparación",
	retirar: "Retirar",
	"falta-pagar": "Falta pagar",
	terminadas: "Terminadas",
	cancelada: "Canceladas",
	cancelado: "Canceladas",
	cancelled: "Canceladas",
};

const getRangeStartDate = (range: AnalyticsRange) => {
	const now = new Date();
	const start = new Date(now);

	if (range === "today") {
		start.setHours(0, 0, 0, 0);
		return start;
	}

	if (range === "7d") {
		start.setDate(now.getDate() - 6);
		start.setHours(0, 0, 0, 0);
		return start;
	}

	start.setDate(now.getDate() - 29);
	start.setHours(0, 0, 0, 0);
	return start;
};

const getDateKey = (date: Date) => date.toISOString().split("T")[0];

const getDateLabel = (date: Date) => {
	return date.toLocaleDateString("es-AR", {
		day: "2-digit",
		month: "2-digit",
	});
};

const isCancelled = (order: Order) => {
	return ["cancelada", "cancelado", "cancelled"].includes(order.status);
};

const isCompleted = (order: Order) => {
	return order.status === "terminadas";
};

const getOrderItems = (order: Order) => {
	return Array.isArray(order.items) ? order.items : [];
};

const getItemId = (item: any) => {
	return String(
		item.id ??
			item.product_id ??
			item.productId ??
			item.menu_item_id ??
			item.menuItemId ??
			item.name
	);
};

const getItemName = (item: any, productsById: Map<string, any>) => {
	const itemId = getItemId(item);
	const product = productsById.get(itemId);

	return item.name ?? item.product_name ?? product?.name ?? "Producto";
};

const getItemUnitPrice = (item: any, productsById: Map<string, any>) => {
	const directPrice =
		item.unit_price ??
		item.unitPrice ??
		item.price ??
		item.precio;

	if (directPrice !== undefined && directPrice !== null) {
		return Number(directPrice);
	}

	const itemId = getItemId(item);
	const product = productsById.get(itemId);

	return Number(product?.price ?? product?.unit_price ?? product?.precio ?? 0);
};

export function useRestaurantAnalytics(range: AnalyticsRange = "7d") {
	const { orders, loading: ordersLoading } = useOrders();

	const { products, loading: productsLoading } = useProducts();

	const data = useMemo<RestaurantAnalytics>(() => {
		const productsById = new Map<string, any>();

        products.forEach((product: any) => {
            productsById.set(String(product.id), product);
        });

		const startDate = getRangeStartDate(range);

		const filteredOrders = orders.filter((order) => {
			const createdAt = new Date(order.created_at);
			return createdAt >= startDate;
		});

		const revenueOrders = filteredOrders.filter((order) => !isCancelled(order));

		const totalRevenue = revenueOrders.reduce(
			(acc, order) => acc + Number(order.total || 0),
			0
		);

		const totalOrders = filteredOrders.length;

		const averageTicket =
			revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

		const completedOrders = filteredOrders.filter(isCompleted).length;
		const cancelledOrders = filteredOrders.filter(isCancelled).length;

		const revenueMap = new Map<
			string,
			{ label: string; revenue: number; orders: number }
		>();

		const statusMap = new Map<string, number>();

		const productMap = new Map<
			string,
			{ id: string; name: string; quantity: number; revenue: number }
		>();

		const tableMap = new Map<
			string,
			{ id: string; name: string; orders: number; revenue: number }
		>();

		filteredOrders.forEach((order) => {
			const createdAt = new Date(order.created_at);
			const dateKey = getDateKey(createdAt);

			if (!revenueMap.has(dateKey)) {
				revenueMap.set(dateKey, {
					label: getDateLabel(createdAt),
					revenue: 0,
					orders: 0,
				});
			}

			const day = revenueMap.get(dateKey)!;
			day.orders += 1;

			if (!isCancelled(order)) {
				day.revenue += Number(order.total || 0);
			}

			const statusLabel = statusLabels[order.status] || order.status;
			statusMap.set(statusLabel, (statusMap.get(statusLabel) || 0) + 1);

			const tableId = order.qr_location_id || "sin-ubicacion";
			const tableName = order.qr_location_id || "Sin ubicación";

			if (!tableMap.has(tableId)) {
				tableMap.set(tableId, {
					id: tableId,
					name: tableName,
					orders: 0,
					revenue: 0,
				});
			}

			const table = tableMap.get(tableId)!;
			table.orders += 1;

			if (!isCancelled(order)) {
				table.revenue += Number(order.total || 0);
			}

			getOrderItems(order).forEach((item: any) => {
				const id = getItemId(item);
				const name = getItemName(item, productsById);
				const quantity = Number(item.quantity ?? item.qty ?? 1);
				const unitPrice = getItemUnitPrice(item, productsById);
				const revenue = unitPrice * quantity;

				if (!productMap.has(id)) {
					productMap.set(id, {
						id,
						name,
						quantity: 0,
						revenue: 0,
					});
				}

				const product = productMap.get(id)!;
				product.quantity += quantity;

				if (!isCancelled(order)) {
					product.revenue += revenue;
				}
			});
		});

		return {
			totalRevenue,
			totalOrders,
			averageTicket,
			activeTables: tableMap.size,
			avgPreparationTime: 0,
			completedOrders,
			cancelledOrders,
			revenueByDay: Array.from(revenueMap.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([, value]) => value),
			ordersByStatus: Array.from(statusMap.entries()).map(
				([status, total]) => ({
					status,
					total,
				})
			),
			topProducts: Array.from(productMap.values())
				.sort((a, b) => b.quantity - a.quantity)
				.slice(0, 5),
			topTables: Array.from(tableMap.values())
				.sort((a, b) => b.revenue - a.revenue)
				.slice(0, 5),
		};
	}, [orders, products, range]);

	return {
		data,
		loading: ordersLoading || productsLoading,
		error: null,
	};
}