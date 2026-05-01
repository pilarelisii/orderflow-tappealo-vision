"use client";
import { useState } from "react";


const videoItems = [
	{
		id: "qr",
		label: "QRs",
		video: "/videos/qrs.mov",
		title: "QR único por mesa",
		desc: "Cada mesa tiene su propio QR para identificar pedidos y llamados automáticamente.",
	},
	{
		id: "orders",
		label: "Comandas",
		video: "/videos/comandas.mp4",
		title: "Gestión de comandas",
		desc: "Los pedidos llegan organizados y en tiempo real al panel del restaurante.",
	},
	{
		id: "menu",
		label: "Menú",
		video: "/videos/menu.mov",
		title: "Menú digital",
		desc: "El cliente explora categorías, platos e imágenes desde su celular.",
	},
	{
		id: "realtime",
		label: "Tiempo real",
		video: "/videos/menu-realtime.mov",
		title: "Actualización en tiempo real",
		desc: "Cambios en el menú o estado del pedido se reflejan al instante.",
	},
	{
		id: "edit",
		label: "Editar comercio",
		video: "/videos/comercio.mov",
		title: "Edición del restaurante",
		desc: "Modificá información, platos y precios desde el panel administrador.",
	},
	{
		id: "promo",
		label: "Promociones",
		video: "/videos/promociones.mov",
		title: "Promociones y destacados",
		desc: "Impulsá ventas mostrando productos destacados o promociones.",
	},
	{
		id: "calls",
		label: "Llamadas",
		video: "/videos/llamadas-mesas.mov",
		title: "Llamadas de mesa",
		desc: "El cliente puede llamar al mozo sin levantar la mano.",
	},
];

export default function DemoSection() {
	const [active, setActive] = useState(videoItems[0]);

	return (
		<section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
			<div className="text-center mb-12">
				<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">
					Demo del sistema
				</p>
				<h2 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-6xl">
					Mirá cómo funciona Tappealo
				</h2>
				<p className="mt-5 text-lg text-[#7a6657]">
					Cada funcionalidad explicada en segundos.
				</p>
			</div>

			{/* Tabs */}
			<div className="flex flex-wrap justify-center gap-3 mb-10">
				{videoItems.map((item) => (
					<button
						key={item.id}
						onClick={() => setActive(item)}
						className={`px-5 py-3 rounded-full text-sm font-bold transition ${
							active.id === item.id
								? "bg-[#5a351f] text-[#fff7ec] shadow"
								: "bg-[#fffaf3] border border-[#d8c2ad] text-[#5a351f] hover:bg-[#f6eadb]"
						}`}
					>
						{item.label}
					</button>
				))}
			</div>

			{/* Video Card */}
			<div className="rounded-[2rem] border border-[#d8c2ad] bg-[#fffaf3] p-6 shadow-lg">
				<div className="flex flex-col gap-10 items-center ">
					{/* Video */}
					<div className="rounded-2xl overflow-hidden border border-[#d8c2ad] bg-black aspect-video">
						<video
							key={active.video}
							src={active.video}
							autoPlay
							loop
							muted
							playsInline
							className="w-full h-full object-cover"
						/>
					</div>

					{/* Text */}
					<div className="w-full text-left py-5 px-10">
						<h3 className="text-2xl font-black text-[#2b1a10]">
							{active.title}
						</h3>
						<p className="mt-4 text-lg text-[#7a6657]">{active.desc}</p>
					</div>
				</div>
			</div>
		</section>
	);
}
