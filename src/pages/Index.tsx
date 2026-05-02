import { useEffect } from "react";
import tappealoLogo from "@/assets/tappealo-logo.png";
import DemoSection from "@/components/DemoSection";

const WHATSAPP_LINK =
	"https://wa.me/542212021296/?text=Hola!%20quiero%20más%20información%20sobre%20Tappealo";

function Icon({ name, className = "" }) {
	const icons = {
		arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
		qr: (
			<>
				<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
				<path d="M14 14h2v2h-2zM18 14h2v6h-2zM14 18h2v2h-2z" />
			</>
		),
		utensils: (
			<>
				<path d="M7 3v8M4 3v8M10 3v8M4 7h6M7 11v10" />
				<path d="M17 3c2 2 3 5 3 8 0 2-1 4-3 4v6" />
			</>
		),
		cart: (
			<>
				<path d="M3 4h2l2 12h11l2-8H7" />
				<path d="M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
			</>
		),
		bell: (
			<>
				<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
				<path d="M10 21h4" />
			</>
		),
		dashboard: (
			<>
				<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />
			</>
		),
		spreadsheet: (
			<>
				<path d="M5 3h14v18H5z" />
				<path d="M5 8h14M5 13h14M10 8v13M15 8v13" />
			</>
		),
		menu: (
			<>
				<path d="M4 7h16M4 12h16M4 17h16" />
			</>
		),
		sparkles: (
			<>
				<path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z" />
				<path d="M19 15l.7 2.2L22 18l-2.3.8L19 21l-.7-2.2L16 18l2.3-.8L19 15Z" />
			</>
		),
		message: (
			<>
				<path d="M21 12a8 8 0 0 1-12.8 6.4L3 20l1.6-5.2A8 8 0 1 1 21 12Z" />
			</>
		),
		card: (
			<>
				<path d="M3 6h18v12H3zM3 10h18" />
			</>
		),
		chef: (
			<>
				<path d="M7 10a4 4 0 1 1 5-5 4 4 0 1 1 5 5v8H7v-8Z" />
				<path d="M7 14h10M8 21h8" />
			</>
		),
		list: (
			<>
				<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
			</>
		),
		wallet: (
			<>
				<path d="M3 7h18v12H3z" />
				<path d="M16 12h5v4h-5zM3 7l14-3v3" />
			</>
		),
	};

	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{icons[name]}
		</svg>
	);
}

function Reveal({ children, className = "", delay = 0 }) {
	return (
		<div
			className={`reveal ${className}`}
			style={{ animationDelay: `${delay}ms` }}
		>
			{children}
		</div>
	);
}

const features = [
	{
		icon: "qr",
		title: "QR único por mesa",
		text: "Cada mesa tiene su propio acceso. El pedido queda asociado al restaurante y a la ubicación correcta.",
	},
	{
		icon: "utensils",
		title: "Menú digital interactivo",
		text: "Categorías, platos, imágenes, descripciones y precios actualizados desde el panel.",
	},
	{
		icon: "cart",
		title: "Pedidos desde la mesa",
		text: "El cliente agrega productos, modifica cantidades y envía el pedido sin descargar una app.",
	},
	{
		icon: "bell",
		title: "Llamado al mozo",
		text: "Comunicación directa para pedir asistencia, solicitar algo extra o mejorar la atención.",
	},
	{
		icon: "dashboard",
		title: "Panel administrador",
		text: "Gestión de menú, mesas, pedidos, estados y operación diaria desde un solo lugar.",
	},
	{
		icon: "spreadsheet",
		title: "Carga inicial con Excel",
		text: "Pensado para acelerar la implementación y cargar el menú completo en menos tiempo.",
	},
];

const steps = [
	"El cliente escanea el QR de su mesa.",
	"Explora el menú digital desde el celular.",
	"Agrega productos al carrito y confirma el pedido.",
	"Cocina o caja recibe la orden en el panel.",
	"El equipo actualiza el estado y atiende llamados.",
];

const adminItems = [
	"Crear categorías y platos",
	"Editar precios, imágenes y descripciones",
	"Ver pedidos entrantes en tiempo real",
	"Marcar pedidos como pendiente, en preparación, listo o entregado",
	"Crear mesas y generar QR únicos",
	"Recibir avisos cuando un cliente llama al mozo",
	"Integración con Mercado Pago",
];

const benefits = [
	["Menos espera", "El cliente pide cuando quiere, sin depender del mozo."],
	["Menos errores", "El pedido llega registrado y asociado a la mesa."],
	["Más venta", "Imágenes, destacados y mejor presentación del menú."],
	["Más orden", "Pedidos y estados centralizados en el panel."],
];

const futureItems = [
	{ icon: "card", title: "Pagos con debito/credito" },
	{ icon: "chef", title: "Integración con cocina" },
	{ icon: "list", title: "Métricas de ventas" },
	{ icon: "wallet", title: "Fidelización y marketing" },
];

const faqs = [
	[
		"¿El cliente tiene que descargar una app?",
		"No. Entra desde el navegador escaneando el QR de la mesa.",
	],
	[
		"¿Se pueden cargar imágenes y precios?",
		"Sí. El restaurante administra categorías, platos, descripciones, precios e imágenes desde el panel.",
	],
	[
		"¿Cuánto tiempo tarda en implementarse?",
		"En menos de 24 horas podés tener tu menú digital funcionando con QR en tus mesas.",
	],
	[
		"¿Necesito conocimientos técnicos para usarlo?",
		"No. El sistema está pensado para que cualquier persona del equipo pueda gestionarlo fácilmente.",
	],
	[
		"¿Puedo modificar el menú en cualquier momento?",
		"Sí. Los cambios se reflejan en tiempo real sin necesidad de reimprimir nada.",
	],
	[
		"¿Funciona en cualquier celular?",
		"Sí. Funciona desde cualquier smartphone con cámara y navegador, sin importar el sistema operativo.",
	],
	[
		"¿Qué pasa si el cliente no tiene internet?",
		"El sistema funciona solo con conexión a internet.",
	],
	[
		"¿Se puede usar en bares y no solo restaurantes?",
		"Sí. Tappealo está pensado para bares, cafeterías y cualquier negocio gastronómico.",
	],
	[
		"¿Incluye soporte?",
		"Sí. Durante la prueba y luego de la contratación incluimos soporte para ayudarte en todo momento.",
	],
	[
		"¿Qué pasa después del mes de prueba?",
		"Podés elegir un plan que se adapte a tu negocio y seguir usando el sistema sin perder la información cargada.",
	],
	[
		"¿Cómo ayudan los QR a mejorar el servicio?",
		"Permiten que el cliente llame al mozo o haga su pedido desde la mesa, agilizando la atención y reduciendo la espera.",
	],
	[
		"¿Se pueden cargar muchos productos?",
		"Sí. Para todos los planes, el sistema permite cargar platos, promociones y categorías ilimitadas.",
	],
];

export default function Index() {
	useEffect(() => {
		document.title = "Tappealo - Restaurante digital";
	}, []);

	return (
		<main className="min-h-screen overflow-hidden bg-[#fff7ec] text-[#2b1a10]">
			<style>{`
        html { scroll-behavior: smooth; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes floatSoft {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        .reveal {
          opacity: 0;
          animation: fadeUp 0.75s ease-out forwards;
        }

        .float-soft {
          animation: floatSoft 5s ease-in-out infinite;
        }
      `}</style>

			<section className="relative min-h-screen border-b border-[#d8c2ad] bg-[radial-gradient(circle_at_50%_0%,rgba(139,90,60,0.22),transparent_38%),linear-gradient(rgba(90,53,31,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(90,53,31,0.045)_1px,transparent_1px)] bg-[size:100%_100%,96px_96px,96px_96px]">
				<header className="absolute inset-x-0 top-0 z-20 border-b border-[#d8c2ad] bg-[#fff7ec]/85 backdrop-blur-xl">
					<div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
						<a
							href="#inicio"
							className="flex items-center gap-3"
							aria-label="Ir al inicio"
						>
							<img src={tappealoLogo} alt="Tappealo" className="w-28" />
						</a>

						<nav
							className="hidden items-center gap-8 text-sm text-[#7a6657] md:flex"
							aria-label="Navegación principal"
						>
							<a
								href="#como-funciona"
								className="transition hover:text-[#5a351f]"
							>
								Cómo funciona
							</a>
							<a
								href="#funcionalidades"
								className="transition hover:text-[#5a351f]"
							>
								Funcionalidades
							</a>
							<a href="#panel" className="transition hover:text-[#5a351f]">
								Panel
							</a>
							<a href="#faq" className="transition hover:text-[#5a351f]">
								FAQ
							</a>
						</nav>
						<div className="flex flex-row gap-5">
							<a
								href="https://tappealo.com/manual"
								target="_blank"
								rel="noopener noreferrer"
								className="hidden rounded-2xl bg-[#5a351f] px-5 py-3 text-sm font-bold text-[#fff7ec] shadow-[0_12px_30px_rgba(90,53,31,0.22)] transition hover:scale-[1.03] md:block"
							>
								Manual de uso
							</a>
							<a
								href="https://tappealo.com/login"
								target="_blank"
								rel="noopener noreferrer"
								className="rounded-2xl border border-[#5a351f] bg-[#fff7ec] px-5 py-3 text-sm font-bold text-[#5a351f] shadow-[0_12px_30px_rgba(90,53,31,0.22)] transition hover:scale-[1.03] block"
							>
								Iniciar Sesión
							</a>
						</div>
					</div>
				</header>

				<div
					id="inicio"
					className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-5 pb-20 pt-36 text-center md:px-8 md:pt-44"
				>
					<div className="max-w-5xl">
						<Reveal className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-[#d8c2ad] bg-[#fffaf3]/90 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-[#5a351f] shadow-sm">
							<Icon name="sparkles" className="h-4 w-4" />
							Plataforma gastronómica
						</Reveal>

						<Reveal delay={100}>
							<h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] text-[#2b1a10] md:text-8xl">
								La operación de tu restaurante,{" "}
								<span className="text-[#8b5a3c]">en una sola mesa.</span>
							</h1>
						</Reveal>

						<Reveal delay={200}>
							<p className="mx-auto mt-7 max-w-3xl text-lg leading-8 text-[#7a6657] md:text-xl">
								Tappealo conecta cliente, mesa, cocina y caja con un menú QR
								interactivo. Menos esperas, menos errores y una experiencia más
								rápida desde el celular.
							</p>
						</Reveal>

						<Reveal
							delay={300}
							className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row"
						>
							<a
								href={WHATSAPP_LINK}
								target="_blank"
								rel="noopener noreferrer"
								className="group rounded-2xl bg-[#5a351f] px-7 py-4 text-base font-black text-[#fff7ec] shadow-[0_16px_35px_rgba(90,53,31,0.25)] transition hover:scale-[1.03]"
							>
								Solicitar demo{" "}
								<Icon
									name="arrow"
									className="ml-2 inline h-5 w-5 transition group-hover:translate-x-1"
								/>
							</a>

							<a
								href="#como-funciona"
								className="rounded-2xl border border-[#d8c2ad] bg-[#fffaf3] px-7 py-4 text-base font-bold text-[#5a351f] shadow-sm transition hover:border-[#8b5a3c] hover:bg-[#f6eadb]"
							>
								Ver cómo funciona
							</a>
						</Reveal>

						<Reveal delay={400}>
							<p className="mt-6 text-sm text-[#7a6657]">
								Sin app para el cliente · QR por mesa · Panel administrador ·
								Pedidos y llamados
							</p>
						</Reveal>
					</div>

					<Reveal delay={500} className="relative mt-16 w-full max-w-6xl">
						<div className="absolute -inset-4 rounded-[2.5rem] bg-[#8b5a3c]/20 blur-3xl" />

						<div className="relative overflow-hidden rounded-[2rem] border border-[#d8c2ad] bg-[#fffaf3] shadow-2xl float-soft">
							<div className="flex items-center justify-between border-b border-[#d8c2ad] bg-[#fff7ec] px-5 py-4">
								<div className="flex gap-2" aria-hidden="true">
									<span className="h-3 w-3 rounded-full bg-[#8b5a3c]" />
									<span className="h-3 w-3 rounded-full bg-[#d8c2ad]" />
									<span className="h-3 w-3 rounded-full bg-[#5a351f]" />
								</div>

								<div className="rounded-full bg-[#f6eadb] px-4 py-2 text-xs text-[#7a6657]">
									tappealo.com/panel
								</div>

								<div className="w-[52px]" />
							</div>

							<div className="grid gap-0 md:grid-cols-[0.9fr_1.3fr]">
								<div className="border-b border-[#d8c2ad] bg-[#fffaf3] p-6 text-left md:border-b-0 md:border-r">
									<div className="mb-6 flex items-center gap-3">
										<div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#5a351f] text-[#fff7ec]">
											<Icon name="qr" className="h-6 w-6" />
										</div>

										<div>
											<p className="font-black text-[#2b1a10]">Mesa 12</p>
											<p className="text-sm text-[#7a6657]">
												Pedido recibido · 20:43
											</p>
										</div>
									</div>

									<div className="space-y-3">
										{[
											"Burger Tappealo x2",
											"Papas rústicas x1",
											"Limonada x2",
										].map((item) => (
											<div
												key={item}
												className="rounded-2xl border border-[#d8c2ad] bg-white p-4 text-sm font-medium text-[#2b1a10] shadow-sm"
											>
												{item}
											</div>
										))}
									</div>

									<div className="mt-5 rounded-2xl border border-[#cfa98a] bg-[#f6eadb] p-4 text-sm font-semibold text-[#5a351f]">
										El cliente solicitó atención del mozo.
									</div>
								</div>

								<div className="bg-white p-6 text-left">
									<div className="mb-5 flex items-center justify-between gap-4">
										<div>
											<p className="text-sm uppercase tracking-[0.2em] text-[#8b5a3c]">
												Menú digital
											</p>
											<h3 className="text-2xl font-black text-[#2b1a10]">
												Tu restaurante
											</h3>
										</div>

										<div className="rounded-full border border-[#d8c2ad] bg-[#fff7ec] px-4 py-2 text-sm text-[#7a6657]">
											Abierto
										</div>
									</div>

									<div className="grid gap-4 sm:grid-cols-3">
										{["Entradas", "Principales", "Bebidas"].map((item) => (
											<div
												key={item}
												className="rounded-2xl border border-[#d8c2ad] bg-[#fffaf3] p-4 shadow-sm"
											>
												<div className="mb-4 h-24 rounded-xl bg-gradient-to-br from-[#d8c2ad] via-[#f6eadb] to-[#8b5a3c]" />
												<p className="font-bold text-[#2b1a10]">{item}</p>
												<p className="mt-1 text-xs text-[#7a6657]">
													Imagen, descripción y precio
												</p>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</Reveal>
				</div>
			</section>

			<section
				className="mx-auto max-w-7xl px-5 py-24 md:px-8"
				id="como-funciona"
			>
				<div className="mb-12 grid gap-6 md:grid-cols-[1fr_0.8fr] md:items-end">
					<Reveal>
						<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">
							Cómo funciona
						</p>
						<h2 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-6xl">
							Del QR al pedido, sin fricción.
						</h2>
					</Reveal>

					<Reveal delay={120}>
						<p className="text-lg leading-8 text-[#7a6657]">
							El cliente no se registra, no descarga nada y no espera a que
							alguien le tome el pedido. Todo sucede desde el navegador.
						</p>
					</Reveal>
				</div>

				<div className="grid gap-4 md:grid-cols-5">
					{steps.map((step, index) => (
						<Reveal
							key={step}
							delay={index * 90}
							className="rounded-[1.5rem] border border-[#d8c2ad] bg-[#fffaf3] p-5 shadow-sm"
						>
							<span className="text-sm font-black text-[#8b5a3c]">
								0{index + 1}
							</span>
							<p className="mt-8 text-lg font-bold leading-7 text-[#2b1a10]">
								{step}
							</p>
						</Reveal>
					))}
				</div>
			</section>

			<section
				className="border-y border-[#d8c2ad] bg-[#f6eadb] px-5 py-24 md:px-8"
				id="funcionalidades"
			>
				<div className="mx-auto max-w-7xl">
					<Reveal className="mx-auto mb-14 max-w-3xl text-center">
						<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">
							Funcionalidades
						</p>
						<h2 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-6xl">
							Todo lo que necesitás para ordenar la operación.
						</h2>
					</Reveal>

					<div className="grid gap-5 md:grid-cols-3">
						{features.map(({ icon, title, text }, index) => (
							<Reveal
								key={title}
								delay={index * 90}
								className="group rounded-[1.7rem] border border-[#d8c2ad] bg-[#fffaf3] p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#8b5a3c]/80 hover:shadow-md"
							>
								<div className="mb-6 grid h-12 w-12 place-items-center rounded-2xl bg-[#f6eadb] text-[#5a351f] transition group-hover:bg-[#5a351f] group-hover:text-white">
									<Icon name={icon} className="h-6 w-6" />
								</div>

								<h3 className="text-xl font-black text-[#2b1a10]">{title}</h3>
								<p className="mt-3 leading-7 text-[#7a6657]">{text}</p>
							</Reveal>
						))}
					</div>
				</div>
			</section>
			<DemoSection />
			<section
				className="mx-auto grid max-w-7xl gap-12 px-5 py-24 md:grid-cols-2 md:px-8"
				id="panel"
			>
				<div>
					<Reveal>
						<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">
							Panel administrador
						</p>
					</Reveal>

					<Reveal delay={100}>
						<h2 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-6xl">
							Gestioná menú, mesas y pedidos desde un solo lugar.
						</h2>
					</Reveal>

					<Reveal delay={200}>
						<p className="mt-6 text-lg leading-8 text-[#7a6657]">
							Tappealo está pensado para que el restaurante tenga control
							operativo sin complicar al cliente. El equipo ve qué mesa pidió,
							qué productos eligió, a qué hora y en qué estado está cada orden.
						</p>
					</Reveal>
				</div>

				<div className="rounded-[2rem] border border-[#d8c2ad] bg-[#fffaf3] p-5 shadow-sm md:p-7">
					{adminItems.map((item, index) => (
						<Reveal
							key={item}
							delay={index * 80}
							className="flex gap-4 border-b border-[#d8c2ad] py-4 last:border-b-0"
						>
							<span className="font-black text-[#8b5a3c]">0{index + 1}</span>
							<p className="font-bold text-[#2b1a10]">{item}</p>
						</Reveal>
					))}
				</div>
			</section>

			<section className="border-y border-[#d8c2ad] bg-[#f6eadb] px-5 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="grid gap-5 md:grid-cols-4">
						{benefits.map(([title, text], index) => (
							<Reveal
								key={title}
								delay={index * 90}
								className="rounded-[1.7rem] border border-[#d8c2ad] bg-[#fffaf3] p-6 shadow-sm"
							>
								<h3 className="text-2xl font-black text-[#2b1a10]">{title}</h3>
								<p className="mt-3 leading-7 text-[#7a6657]">{text}</p>
							</Reveal>
						))}
					</div>
				</div>
			</section>

			<section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
				<Reveal className="rounded-[2rem] border border-[#d8c2ad] bg-[radial-gradient(circle_at_20%_10%,rgba(139,90,60,0.22),transparent_35%),#fffaf3] p-8 shadow-sm md:p-12">
					<div className="mb-10 max-w-3xl">
						<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">
							Visión a futuro
						</p>
						<h2 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-6xl">
							Una plataforma gastronómica completa.
						</h2>
						<p className="mt-5 text-lg leading-8 text-[#7a6657]">
							La base es el menú QR con pedidos y comunicación. A partir de ahí,
							Tappealo puede evolucionar hacia reservas, métricas y herramientas
							de fidelización.
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-4">
						{futureItems.map(({ icon, title }, index) => (
							<div
								key={title}
								className="rounded-3xl border border-[#d8c2ad] bg-white p-6 shadow-sm"
								style={{ animationDelay: `${index * 100}ms` }}
							>
								<Icon name={icon} className="mb-5 h-7 w-7 text-[#5a351f]" />
								<p className="font-black text-[#2b1a10]">{title}</p>
							</div>
						))}
					</div>
				</Reveal>
			</section>

			<section className="mx-auto max-w-4xl px-5 pb-24 md:px-8" id="faq">
				<Reveal className="mb-10 text-center">
					<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">
						Preguntas frecuentes
					</p>
					<h2 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-5xl">
						¿Tenés dudas? Te lo explicamos simple.
					</h2>
				</Reveal>

				{faqs.map(([question, answer], index) => (
					<Reveal key={question} delay={index * 80}>
						<details className="group mb-4 rounded-3xl border border-[#d8c2ad] bg-[#fffaf3] p-6 shadow-sm">
							<summary className="cursor-pointer list-none text-lg font-black text-[#2b1a10]">
								{question}
							</summary>
							<p className="mt-4 leading-7 text-[#7a6657]">{answer}</p>
						</details>
					</Reveal>
				))}
			</section>

			<section className="px-5 pb-12 md:px-8">
				<Reveal className="mx-auto max-w-7xl rounded-[2rem] border border-[#6b442b] bg-[#5a351f] p-8 text-center shadow-[0_18px_45px_rgba(90,53,31,0.25)] md:p-12">
					<h2 className="text-4xl font-black tracking-[-0.04em] text-[#fff7ec] md:text-6xl">
						Digitalizá tu restaurante sin cambiar la forma de trabajar.
					</h2>
					<p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#fff7ec]/85">
						Probá una demo y mirá cómo Tappealo puede ordenar pedidos, mesas y
						comunicación con clientes.
					</p>
					<a
						href={WHATSAPP_LINK}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-8 inline-flex items-center rounded-2xl bg-[#fff7ec] px-7 py-4 font-black text-[#4a2b19] transition hover:scale-[1.03]"
					>
						Agendar una demo <Icon name="arrow" className="ml-2 h-5 w-5" />
					</a>
				</Reveal>
			</section>

			<footer className="border-t border-[#d8c2ad] px-5 py-8 text-center text-sm text-[#7a6657] md:px-8">
				· © Tappealo 2026 ·
			</footer>

			<a
				href={WHATSAPP_LINK}
				target="_blank"
				rel="noopener noreferrer"
				className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-[#5a351f] text-white shadow-[0_0_35px_rgba(90,53,31,0.45)]"
				aria-label="Contactar por WhatsApp"
			>
				<Icon name="message" className="h-7 w-7" />
			</a>
		</main>
	);
}
