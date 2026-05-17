import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Bell, BellDot, Receipt } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useCalls } from "@/hooks/useCalls";

function formatHour(ts: any) {
	try {
		const d = ts?.toDate?.()
			? ts.toDate()
			: typeof ts === "number"
			? new Date(ts)
			: ts instanceof Date
			? ts
			: null;

		if (!d) return "";
		return d.toLocaleTimeString("es-AR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
}

export default function Notifications({visible}) {
	const { venue } = useAuth();

	const { calls, pendingCount, loading, markSeen, resolve } = useCalls({
		venueId: venue?.id,
		includeResolved: false,
		take: 50,
	});

	const sortedCalls = useMemo(() => {
		return [...calls].sort((a: any, b: any) => {
			const am = a?.created_at?.toMillis?.() ?? Number(a?.created_at_ms ?? 0);
			const bm = b?.created_at?.toMillis?.() ?? Number(b?.created_at_ms ?? 0);
			return bm - am;
		});
	}, [calls]);


	
	if(!visible) return null;
	if (loading) {
		return (
			<div className="mt-6 flex-1">
				<h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
					<Bell className="w-5 h-5" />
					Llamadas de mesas
				</h2>
				<div className="text-sm text-muted-foreground">Cargando llamadas…</div>
			</div>
		);
	}
	
	return (
		<div className="mt-6 flex-1">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-xl font-bold text-foreground flex items-center gap-2">
					<Bell className="w-5 h-5" />
					Llamadas de mesas
				</h2>

				<div className="text-sm text-muted-foreground">
					Pendientes:{" "}
					<span className="font-semibold text-foreground">{pendingCount}</span>
				</div>
			</div>

			{sortedCalls.length === 0 ? (
				<div className="text-sm text-muted-foreground">No hay llamadas.</div>
			) : (
				<div className="space-y-3">
					{sortedCalls.map((c) => {
						const title = c.qr_location_name ?? "Mesa";
						const time = formatHour(c.created_at ?? c.created_at_ms);
                        const status = (c.status ?? "pending");
						const checked = c.status === "seen" || c.status === "resolved";
						const type = c.type;

						return (
							<Card key={c.id} className="overflow-hidden">
								<div className="w-full p-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div
											className={`rounded-full p-2 ${
												type === "bill" ? "bg-green-500/10" : "bg-primary/10"
											}`}
										>
											{type === "bill" ? (
												<Receipt className="w-4 h-4 text-green-600" />
											) : (
												<BellDot className="w-4 h-4 text-primary" />
											)}
										</div>

										<div className="text-left">
											<div className="flex items-center gap-2">
												<p className="font-semibold text-foreground capitalize">
													{title}
												</p>

												<span
													className={`text-xs px-2 py-1 rounded-full font-medium ${
														type === "bill"
															? "bg-green-100 text-green-700"
															: "bg-blue-100 text-blue-700"
													}`}
												>
													{type === "bill"
														? "Pedido de cuenta"
														: "Llamado al mozo"}
												</span>
											</div>

											{time ? (
												<p className="text-sm text-muted-foreground">{time}</p>
											) : null}
										</div>
									</div>

									<div className="flex items-center gap-3">
										<span className="text-sm text-muted-foreground">
											{checked ? "Visto" : "Pendiente"}
										</span>

										<Checkbox
											checked={checked}
											disabled={checked}
											onClick={async (e) => {
												e.preventDefault();
												e.stopPropagation();

												try {
													if (status === "pending") await markSeen(c.id);
												} catch (err) {
													console.error("markSeen UI error:", err);
												}
											}}
										/>

										<button
											type="button"
											className="text-sm text-primary hover:underline"
											onClick={async () => {
												await resolve(c.id);
											}}
										>
											Resolver
										</button>
									</div>
								</div>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
