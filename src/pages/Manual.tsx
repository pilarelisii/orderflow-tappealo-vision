"use client";

import {
	BadgePercent,
	BookOpen,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	CreditCard,
	FileSpreadsheet,
	FolderCog,
	LayoutDashboard,
	Menu,
	Pencil,
	PlusCircle,
	QrCode,
	Star,
	Store,
	UtensilsCrossed,
	X,
	type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

type SectionItem = {
	id: string;
	label: string;
	icon: LucideIcon;
	children?: SectionItem[];
};

const sections: SectionItem[] = [
	{ id: "vista-principal", label: "Vista Principal", icon: LayoutDashboard },
	{
		id: "menu",
		label: "Menú",
		icon: UtensilsCrossed,
		children: [
			{ id: "cargar-excel", label: "Cargar por Excel", icon: FileSpreadsheet },
			{ id: "agregar-producto", label: "Agregar Producto", icon: PlusCircle },
			{
				id: "gestionar-categorias",
				label: "Gestionar Categorías",
				icon: FolderCog,
			},
			{ id: "productos-destacados", label: "Productos Destacados", icon: Star },
			{ id: "editar-productos", label: "Editar Productos", icon: Pencil },
		],
	},
	{ id: "promociones", label: "Promociones", icon: BadgePercent },
	{ id: "qrs", label: "Gestión de QR", icon: QrCode },
	{ id: "comercio", label: "Comercio", icon: Store },
	{ id: "metodos-pago", label: "Métodos de Pago", icon: CreditCard },
];

export default function Manual() {
	const [activeSection, setActiveSection] = useState("vista-principal");
	const [menuOpen, setMenuOpen] = useState(true);
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

	const scrollToSection = (id: string) => {
		const section = sectionRefs.current[id];

		if (!section) return;

		window.scrollTo({
			top: section.offsetTop - 24,
			behavior: "smooth",
		});
	};

	const handleSectionPress = (id: string) => {
		setActiveSection(id);
		setMobileMenuOpen(false);

		setTimeout(() => {
			scrollToSection(id);
		}, 50);
	};

	return (
		<main className="min-h-screen bg-[#fff7ec] text-[#2b1a10]">
			<div className="flex min-h-screen">
				<aside
					className={`${
						mobileMenuOpen ? "flex" : "hidden"
					} fixed left-0 top-0 z-50 h-full w-72 flex-col bg-[#2b1a10] px-4 py-6 md:flex`}
				>
					<div className="h-full flex flex-col justify-between">
						<div className="flex flex-col">
							<div className="mb-6 flex items-center gap-3 border-b border-white/10 pb-6">
								<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
									<BookOpen size={21} color="white" />
								</div>

								<div>
									<p className="text-sm font-bold tracking-wide text-white">
										Manual de Uso
									</p>
									<p className="text-xs text-[#d9c7ba]">
										Guía completa del sistema
									</p>
								</div>
							</div>

							<p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-[#d9c7ba]">
								Secciones
							</p>

							<nav className="flex-1 overflow-y-auto pr-1">
								{sections.map((section) => {
									const Icon = section.icon;
									const isActive = activeSection === section.id;
									const hasChildren = Boolean(section.children?.length);
									const isChildActive =
										hasChildren &&
										section.children!.some(
											(child) => activeSection === child.id
										);

									return (
										<div key={section.id} className="mb-1">
											<button
												type="button"
												onClick={() => {
													if (hasChildren) setMenuOpen((prev) => !prev);
													handleSectionPress(section.id);
												}}
												className={`flex w-full items-center rounded-lg px-3 py-3 text-left transition ${
													isActive || isChildActive
														? "bg-white/10 text-white"
														: "text-[#d9c7ba] hover:bg-white/5 hover:text-white"
												}`}
											>
												<Icon size={16} />
												<span className="ml-3 flex-1 text-sm font-medium">
													{section.label}
												</span>

												{hasChildren ? (
													<ChevronDown
														size={14}
														className={`transition ${
															menuOpen ? "rotate-0" : "-rotate-90"
														}`}
													/>
												) : isActive ? (
													<ChevronRight size={14} />
												) : null}
											</button>

											{hasChildren && menuOpen && (
												<div className="ml-5 mt-1 border-l border-white/10 pl-3">
													{section.children!.map((child) => {
														const ChildIcon = child.icon;
														const isChildItemActive =
															activeSection === child.id;

														return (
															<button
																type="button"
																key={child.id}
																onClick={() => handleSectionPress(child.id)}
																className={`mb-1 flex w-full items-center rounded-lg px-3 py-2 text-left transition ${
																	isChildItemActive
																		? "bg-white/10 text-white"
																		: "text-[#d9c7ba] hover:bg-white/5 hover:text-white"
																}`}
															>
																<ChildIcon size={14} />
																<span className="ml-3 flex-1 text-sm">
																	{child.label}
																</span>
																{isChildItemActive ? (
																	<ChevronRight size={12} />
																) : null}
															</button>
														);
													})}
												</div>
											)}
										</div>
									);
								})}
							</nav>
						</div>

						<a
							href="https://tappealo.com/login"
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-2xl border text-center border-[#5a351f] bg-[#fff7ec] px-5 py-3 text-sm font-bold text-[#5a351f] shadow-[0_12px_30px_rgba(90,53,31,0.22)] transition hover:scale-[1.03] block"
						>
							Iniciar Sesión
						</a>
					</div>
				</aside>

				<section className="flex-1 md:ml-72">
					<header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#d8c2ad] bg-[#fff7ec]/90 px-4 py-4 backdrop-blur-xl md:hidden">
						<button
							type="button"
							onClick={() => setMobileMenuOpen((prev) => !prev)}
						>
							{mobileMenuOpen ? (
								<X size={22} color="#2b1a10" />
							) : (
								<Menu size={22} color="#2b1a10" />
							)}
						</button>
						<p className="text-base font-bold text-[#2b1a10]">Manual de Uso</p>
						<div className="w-6" />
					</header>

					<div className="border-b border-[#d8c2ad] bg-[#2b1a10] px-6 py-12 md:px-10">
						<div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-1.5">
							<p className="text-xs font-medium text-white">
								Documentación Oficial
							</p>
						</div>

						<h1 className="mb-4 text-4xl font-extrabold tracking-[-0.04em] text-white md:text-5xl">
							Manual de Uso de Tappealo
						</h1>

						<p className="max-w-3xl text-base leading-7 text-[#d9c7ba] md:text-lg">
							Guía completa para administrar el sistema de pedidos, menú
							digital, QR por mesa, promociones, comercio y métodos de pago.
						</p>
					</div>

					<div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
						<Section
							id="vista-principal"
							title="Vista Principal"
							icon={LayoutDashboard}
							number="01"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								La vista principal es el centro de control del comercio. Desde
								esta pantalla se administran las operaciones diarias del local y
								se visualiza el estado general del servicio en tiempo real.
							</Paragraph>

							<Grid>
								<FeatureCard
									title="Vista de Pedidos"
									description="Permite visualizar todos los pedidos activos que ingresan desde las mesas o ubicaciones habilitadas."
								/>
								<FeatureCard
									title="Historial de Pedidos"
									description="Muestra los pedidos realizados, ordenados por día y con una referencia única para facilitar el seguimiento."
								/>
								<FeatureCard
									title="Calls / Llamadas"
									description="Muestra las llamadas realizadas por los clientes desde la mesa. El equipo puede marcarlas como vistas o resolverlas."
								/>
							</Grid>

							<InfoCard text="Esta sección es clave para el equipo operativo, ya que permite saber qué está pasando en el local sin depender de avisos manuales o comunicación desordenada." />
						</Section>

						<Section
							id="menu"
							title="Menú"
							icon={UtensilsCrossed}
							number="02"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								La sección Menú permite gestionar la carta digital del comercio.
								Desde acá se pueden cargar productos, organizarlos por
								categorías, editar precios, modificar descripciones, agregar
								imágenes y definir qué productos se quieren destacar.
							</Paragraph>

							<Grid>
								<FeatureCard
									title="Productos"
									description="Alta, edición y eliminación de productos del menú."
								/>
								<FeatureCard
									title="Categorías"
									description="Organización de la carta por grupos como bebidas, entradas, principales o postres."
								/>
								<FeatureCard
									title="Actualización en tiempo real"
									description="Los cambios realizados en el panel se reflejan en el menú público."
								/>
							</Grid>
						</Section>

						<Section
							id="cargar-excel"
							title="Cargar por Excel"
							icon={FileSpreadsheet}
							number="03"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								La carga por Excel permite incorporar productos de forma masiva.
								Es útil para comercios que ya tienen su carta armada y quieren
								agilizar la implementación inicial del sistema.
							</Paragraph>

							<Paragraph>
								El archivo debe respetar una estructura simple, con columnas
								para nombre, descripción, precio y categoría.
							</Paragraph>

							<div className="mb-4 overflow-x-auto">
								<div className="min-w-[650px] overflow-hidden rounded-xl border border-[#d8c2ad] bg-white text-sm">
									<div className="grid grid-cols-4 bg-[#f6eadb] font-bold text-[#2b1a10]">
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											Nombre
										</div>
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											Descripción
										</div>
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											Precio
										</div>
										<div className="px-3 py-3">Categoría</div>
									</div>

									<div className="grid grid-cols-4 border-t border-[#d8c2ad]">
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											Café con leche
										</div>
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											Bebida caliente con leche
										</div>
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											4200
										</div>
										<div className="px-3 py-3">BEBIDAS</div>
									</div>

									<div className="grid grid-cols-4 border-t border-[#d8c2ad] bg-[#fffaf3]">
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											Medialunas
										</div>
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											2 medialunas dulces
										</div>
										<div className="border-r border-[#d8c2ad] px-3 py-3">
											2800
										</div>
										<div className="px-3 py-3">PANADERIA</div>
									</div>
								</div>
							</div>

							<WarningCard text="Importante: la primera fila debe contener los encabezados correctamente. Si el formato no coincide, la carga puede fallar o generar productos incompletos." />

							<Checklist
								items={[
									"Verificar que todos los productos tengan nombre.",
									"Usar precios numéricos, sin símbolos ni textos adicionales.",
									"Escribir las categorías de forma consistente.",
									"Revisar el menú luego de cargar el archivo.",
								]}
							/>
						</Section>

						<Section
							id="agregar-producto"
							title="Agregar Producto"
							icon={PlusCircle}
							number="04"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								Esta opción permite cargar productos de forma manual. Es ideal
								para agregar nuevos platos, bebidas, extras o productos
								puntuales sin necesidad de subir un archivo completo.
							</Paragraph>

							<Checklist
								items={[
									"Nombre del producto.",
									"Descripción clara y breve.",
									"Precio actualizado.",
									"Categoría correspondiente.",
									"Imagen del producto.",
								]}
							/>

							<InfoCard text="Recomendación: usar imágenes claras, con buena iluminación y fondo limpio. Esto mejora la presentación del menú y puede ayudar a aumentar la venta de productos destacados." />
						</Section>

						<Section
							id="gestionar-categorias"
							title="Gestionar Categorías"
							icon={FolderCog}
							number="05"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								Las categorías permiten ordenar el menú digital. Por ejemplo:
								entradas, hamburguesas, pastas, bebidas, cafetería, postres o
								promociones.
							</Paragraph>

							<Checklist
								items={[
									"Crear una nueva categoría ingresando su nombre.",
									"Organizar productos dentro de la categoría correspondiente.",
									"Habilitar o deshabilitar categorías según necesidad.",
									"Mantener nombres simples para que el cliente encuentre rápido lo que busca.",
								]}
							/>

							<WarningCard text="Importante: si deshabilitás una categoría, los productos que pertenecen a esa categoría no se verán en el menú público." />
						</Section>

						<Section
							id="productos-destacados"
							title="Productos Destacados"
							icon={Star}
							number="06"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								Los productos destacados aparecen en una zona prioritaria del
								menú público. Sirven para mostrar platos recomendados, productos
								con mayor margen, novedades o productos que el comercio quiere
								impulsar.
							</Paragraph>

							<Checklist
								items={[
									"Se pueden destacar hasta 4 productos.",
									"Conviene elegir productos atractivos visualmente.",
									"Es recomendable cambiar los destacados según horario, temporada o estrategia comercial.",
									"Los destacados ayudan a orientar la decisión del cliente.",
								]}
							/>
						</Section>

						<Section
							id="editar-productos"
							title="Editar Productos"
							icon={Pencil}
							number="07"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								Desde el botón Editar se pueden modificar productos ya cargados.
								Los cambios se reflejan inmediatamente en el menú público.
							</Paragraph>

							<Checklist
								items={[
									"Modificar nombre del producto.",
									"Actualizar descripción.",
									"Cambiar precio.",
									"Reemplazar imagen.",
									"Cambiar categoría.",
									"Eliminar productos que ya no se ofrecen.",
								]}
							/>

							<InfoCard text="Esta función es útil para mantener el menú actualizado ante cambios de precios, falta de stock o modificaciones en la carta." />
						</Section>

						<Section
							id="promociones"
							title="Promociones"
							icon={BadgePercent}
							number="08"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								La sección Promociones permite crear combos, descuentos o
								propuestas especiales que aparecen primero en el menú público.
								Esto ayuda a impulsar ventas y destacar oportunidades
								comerciales.
							</Paragraph>

							<StepItem
								step="1"
								title="Nombre y estado"
								text="Ingresá el nombre de la promoción y definí si estará habilitada o no."
							/>
							<StepItem
								step="2"
								title="Productos incluidos"
								text="Seleccioná los productos que forman parte de la promoción y sus cantidades."
							/>
							<StepItem
								step="3"
								title="Descuento"
								text="Configurá un descuento por porcentaje o por monto fijo."
							/>
							<StepItem
								step="4"
								title="Imagen"
								text="Agregá una imagen representativa para que la promoción sea visualmente atractiva."
							/>
							<StepItem
								step="5"
								title="ON/OFF"
								text="Activá o desactivá la promoción según disponibilidad, horario o estrategia."
							/>

							<InfoCard text="Ejemplo: podés crear una promoción de hamburguesa + papas + bebida, o una promo de cafetería para horarios de merienda." />
						</Section>

						<Section
							id="qrs"
							title="Gestión de QR para Mesas"
							icon={QrCode}
							number="09"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								Cada QR generado es único para cada mesa o ubicación. Esto
								permite identificar desde dónde se realizó un pedido o una
								llamada al mozo.
							</Paragraph>

							<Paragraph>
								El botón Servicio Activo administra si el menú está disponible
								para el público. Si el servicio está desactivado, el cliente no
								podrá operar normalmente desde el QR.
							</Paragraph>

							<h3 className="mb-3 mt-5 text-lg font-bold text-[#2b1a10]">
								Agregar QR
							</h3>

							<Paragraph>
								Para crear un QR, ingresá un nombre identificable, como Mesa 1,
								Mesa 2, Barra, Terraza, Retiro o Delivery. Luego seleccioná el
								tipo de entrega correspondiente.
							</Paragraph>

							<Grid>
								<FeatureCard
									title="En el lugar"
									description="QRs ubicados dentro del restaurante. Ideal para mesas, barra, terraza o salón."
								/>
								<FeatureCard
									title="Retiro"
									description="Pensado para pedidos que el cliente realiza y luego retira por el comercio."
								/>
								<FeatureCard
									title="Envío"
									description="Pensado para pedidos que el comercio debe acercar al cliente."
								/>
							</Grid>

							<WarningCard text="Recomendación: nombrar los QR de manera clara. Por ejemplo, 'Mesa 1' es mejor que 'QR 1', porque facilita identificar pedidos y llamados." />
						</Section>

						<Section
							id="comercio"
							title="Comercio"
							icon={Store}
							number="10"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								La sección Comercio permite configurar la información pública
								del restaurante. Estos datos aparecen en el menú digital y
								ayudan al cliente a reconocer el comercio correctamente.
							</Paragraph>

							<Checklist
								items={[
									"Logo del comercio.",
									"Instagram o red social principal.",
									"Teléfono de contacto.",
									"Ubicación o dirección del local.",
								]}
							/>

							<InfoCard text="Mantener esta información actualizada transmite confianza y mejora la experiencia del cliente." />
						</Section>

						<Section
							id="metodos-pago"
							title="Métodos de Pago"
							icon={CreditCard}
							number="11"
							activeSection={activeSection}
							sectionRefs={sectionRefs}
						>
							<Paragraph>
								Desde esta sección se administran los medios de cobro
								disponibles para el comercio. Cada medio de pago puede
								configurarse según las necesidades operativas del restaurante.
							</Paragraph>

							<Grid>
								<FeatureCard
									title="Efectivo"
									description="Disponible para pagos presenciales o al momento de entregar el pedido."
								/>
								<FeatureCard
									title="Mercado Pago"
									description="Cualquier método de pago desde la app. Requiere configurar Public Key y Access Token desde Mercado Pago Developers."
								/>
								<FeatureCard
									title="Tarjeta Débito / Crédito"
									description="Funcionalidad pensada para futuras integraciones."
								/>
							</Grid>

							<WarningCard text="Para Mercado Pago, es importante usar credenciales correctas y verificar que pertenezcan a la cuenta del comercio." />
						</Section>
					</div>
				</section>
			</div>
		</main>
	);
}

function Section({
	id,
	title,
	icon: Icon,
	number,
	children,
	activeSection,
	sectionRefs,
}: {
	id: string;
	title: string;
	icon: LucideIcon;
	number: string;
	children: React.ReactNode;
	activeSection: string;
	sectionRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
}) {
	const isActive = activeSection === id;

	return (
		<section
			ref={(ref) => {
				sectionRefs.current[id] = ref;
			}}
			className={`mb-8 rounded-3xl border p-5 shadow-sm transition md:p-7 ${
				isActive ? "border-[#8b5a3c] bg-white" : "border-[#d8c2ad] bg-[#fffaf3]"
			}`}
		>
			<div className="mb-5 flex items-center gap-4">
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f6eadb] text-[#5a351f]">
					<Icon size={22} />
				</div>

				<div>
					<p className="text-xs font-bold uppercase tracking-widest text-[#8b5a3c]">
						{number}
					</p>
					<h2 className="text-2xl font-black tracking-[-0.03em] text-[#2b1a10]">
						{title}
					</h2>
				</div>
			</div>

			{children}
		</section>
	);
}

function Paragraph({ children }: { children: React.ReactNode }) {
	return (
		<p className="mb-4 text-sm leading-7 text-[#5f4a3b] md:text-base">
			{children}
		</p>
	);
}

function Grid({ children }: { children: React.ReactNode }) {
	return <div className="mb-4 grid gap-3 md:grid-cols-3">{children}</div>;
}

function FeatureCard({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="rounded-2xl border border-[#d8c2ad] bg-white p-4">
			<p className="mb-1 text-sm font-bold text-[#2b1a10]">{title}</p>
			<p className="text-sm leading-6 text-[#7a6657]">{description}</p>
		</div>
	);
}

function Checklist({ items }: { items: string[] }) {
	return (
		<div className="mb-4 grid gap-2">
			{items.map((item) => (
				<div
					key={item}
					className="flex items-start gap-3 rounded-2xl border border-[#d8c2ad] bg-white px-4 py-3"
				>
					<CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#5a351f]" />
					<p className="text-sm leading-6 text-[#5f4a3b]">{item}</p>
				</div>
			))}
		</div>
	);
}

function StepItem({
	step,
	title,
	text,
}: {
	step: string;
	title: string;
	text: string;
}) {
	return (
		<div className="mb-3 flex gap-4 rounded-2xl border border-[#d8c2ad] bg-white p-4">
			<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5a351f] text-sm font-bold text-white">
				{step}
			</div>

			<div>
				<p className="mb-1 text-sm font-bold text-[#2b1a10]">{title}</p>
				<p className="text-sm leading-6 text-[#7a6657]">{text}</p>
			</div>
		</div>
	);
}

function InfoCard({ text }: { text: string }) {
	return (
		<div className="mb-4 rounded-2xl border border-[#d8c2ad] bg-[#f6eadb] p-4">
			<p className="text-sm leading-6 text-[#5a351f]">{text}</p>
		</div>
	);
}

function WarningCard({ text }: { text: string }) {
	return (
		<div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
			<p className="text-sm leading-6 text-[#5f3b1b]">{text}</p>
		</div>
	);
}
