import LegalPage, { type LegalSection } from "@/components/LegalPage";

const sections: LegalSection[] = [
	{
		title: "Aceptación de los términos",
		blocks: [
			{ type: "p", text: "Bienvenido a Tappealo." },
			{
				type: "p",
				text: "Estos Términos y Condiciones regulan el acceso y la utilización de la plataforma Tappealo, disponible en https://www.tappealo.com, y de sus funcionalidades vinculadas con la gestión de servicios gastronómicos.",
			},
			{
				type: "p",
				text: "Al contratar el servicio, crear una cuenta o utilizar sus funcionalidades, el usuario acepta las condiciones que correspondan a su relación con la plataforma, sin perjuicio de los derechos reconocidos por la legislación vigente.",
			},
		],
	},
	{
		title: "Descripción del servicio",
		blocks: [
			{
				type: "p",
				text: "Tappealo es una plataforma tecnológica destinada a digitalizar y optimizar la experiencia gastronómica.",
			},
			{ type: "p", text: "Entre sus principales funcionalidades se encuentran:" },
			{
				type: "list",
				items: [
					"Visualización de menús digitales mediante códigos QR.",
					"Consulta de productos, categorías y precios.",
					"Realización y administración de pedidos.",
					"Gestión de mesas y estados de pedidos.",
					"Panel de administración para restaurantes.",
					"Herramientas de gestión para cocina y personal gastronómico.",
					"Registro y gestión de modalidades de pago.",
					"Configuración de productos, promociones y disponibilidad.",
					"Herramientas para optimizar la organización operativa del establecimiento.",
				],
			},
			{
				type: "p",
				text: "Las funcionalidades disponibles podrán variar según el plan contratado, las características del establecimiento y las actualizaciones de la plataforma.",
			},
		],
	},
	{
		title: "Usuarios de la plataforma",
		blocks: [
			{ type: "p", text: "Se distinguen dos categorías principales de usuarios:" },
			{
				type: "definition",
				term: "Restaurantes",
				text: "establecimientos gastronómicos que contratan Tappealo para gestionar y digitalizar sus operaciones.",
			},
			{
				type: "definition",
				term: "Clientes finales",
				text: "personas que acceden a los menús digitales, realizan pedidos o utilizan funcionalidades de Tappealo en los establecimientos adheridos.",
			},
			{
				type: "p",
				text: "Cada categoría de usuario deberá utilizar las funcionalidades correspondientes de manera responsable.",
			},
		],
	},
	{
		title: "Registro y administración de cuentas",
		blocks: [
			{
				type: "p",
				text: "Los restaurantes podrán disponer de cuentas de administración y usuarios autorizados.",
			},
			{ type: "p", text: "Los responsables de cada establecimiento deberán:" },
			{
				type: "list",
				items: [
					"Proporcionar información verdadera y actualizada.",
					"Mantener la confidencialidad de sus credenciales.",
					"Administrar adecuadamente los permisos de acceso.",
					"Informar cualquier uso no autorizado de sus cuentas.",
					"Utilizar la plataforma conforme a la legislación aplicable.",
				],
			},
			{
				type: "p",
				text: "Los clientes finales podrán utilizar las funcionalidades disponibles sin crear una cuenta cuando el sistema así lo permita.",
			},
		],
	},
	{
		title: "Responsabilidades de los restaurantes",
		blocks: [
			{
				type: "p",
				text: "Los restaurantes son responsables de la información comercial y gastronómica que publiquen mediante Tappealo.",
			},
			{ type: "p", text: "Esto incluye:" },
			{
				type: "list",
				items: [
					"La exactitud de los precios publicados.",
					"La descripción y disponibilidad de los productos.",
					"La información sobre ingredientes y alérgenos.",
					"La preparación, calidad e inocuidad de los alimentos.",
					"Los tiempos de preparación y entrega.",
					"La atención de reclamos relacionados con los productos.",
					"La emisión de comprobantes fiscales cuando corresponda.",
					"El cumplimiento de las obligaciones legales propias de su actividad.",
				],
			},
			{
				type: "p",
				text: "Tappealo proporciona herramientas tecnológicas para facilitar estas operaciones, pero no prepara, vende ni entrega los alimentos ofrecidos por los restaurantes, salvo que se acuerde expresamente una intervención diferente.",
			},
		],
	},
	{
		title: "Pedidos y confirmaciones",
		blocks: [
			{
				type: "p",
				text: "Los clientes podrán seleccionar productos y generar pedidos mediante las funcionalidades habilitadas.",
			},
			{
				type: "p",
				text: "La recepción, aceptación, preparación y entrega de los pedidos estará a cargo del restaurante correspondiente.",
			},
			{
				type: "p",
				text: "La disponibilidad de productos y los tiempos informados podrán variar por razones operativas.",
			},
			{
				type: "p",
				text: "Las condiciones de modificación, cancelación o devolución de pedidos deberán ser informadas por el establecimiento y respetar la normativa vigente, incluyendo los derechos irrenunciables de los consumidores.",
			},
		],
	},
	{
		title: "Pagos",
		blocks: [
			{
				type: "p",
				text: "Tappealo podrá ofrecer herramientas para registrar, gestionar o facilitar pagos mediante distintos medios, según las funcionalidades habilitadas.",
			},
			{
				type: "p",
				text: "Entre ellos podrán encontrarse pagos electrónicos, tarjetas, efectivo y otros mecanismos admitidos por el restaurante.",
			},
			{
				type: "p",
				text: "Cuando intervengan procesadores de pagos externos, las operaciones estarán sujetas también a las condiciones del proveedor correspondiente.",
			},
			{
				type: "p",
				text: "La responsabilidad por la venta de productos gastronómicos y por los importes cobrados corresponderá al establecimiento vendedor, sin perjuicio de las responsabilidades que legalmente pudieran corresponder a Tappealo según su intervención efectiva.",
			},
		],
	},
	{
		title: "Planes y contratación comercial",
		blocks: [
			{
				type: "p",
				text: "Tappealo podrá comercializar sus servicios mediante planes de suscripción con diferentes funcionalidades y límites operativos.",
			},
			{
				type: "p",
				text: "Los precios, prestaciones, límites de uso, modalidades de facturación y condiciones de renovación deberán estar detallados en la propuesta comercial o contratación correspondiente.",
			},
			{
				type: "p",
				text: "Cualquier modificación comercial se comunicará conforme a las condiciones pactadas y las disposiciones legales aplicables.",
			},
			{
				type: "p",
				text: "Los servicios adicionales o desarrollos personalizados podrán requerir presupuestos independientes.",
			},
		],
	},
	{
		title: "Cancelación del servicio",
		blocks: [
			{
				type: "p",
				text: "Los restaurantes podrán solicitar la baja del servicio utilizando los canales de atención habilitados.",
			},
			{
				type: "p",
				text: "Las condiciones de finalización, facturación pendiente y eventuales reintegros deberán ajustarse al contrato aplicable y a las disposiciones legales vigentes.",
			},
			{
				type: "p",
				text: "Tappealo no impondrá restricciones que vulneren los derechos de cancelación, arrepentimiento o rescisión reconocidos por la legislación aplicable.",
			},
		],
	},
	{
		title: "Disponibilidad y mantenimiento",
		blocks: [
			{ type: "p", text: "Tappealo procurará mantener la plataforma operativa y ofrecer un servicio estable." },
			{ type: "p", text: "No obstante, podrán producirse interrupciones por:" },
			{
				type: "list",
				items: [
					"Mantenimiento técnico.",
					"Actualizaciones de software.",
					"Problemas de conectividad.",
					"Fallas de proveedores externos.",
					"Incidentes de seguridad.",
					"Circunstancias ajenas al control razonable de la plataforma.",
				],
			},
			{
				type: "p",
				text: "Cuando sea posible, los mantenimientos programados serán comunicados con anticipación.",
			},
			{
				type: "p",
				text: "Tappealo trabajará para solucionar los incidentes detectados, sin perjuicio de las obligaciones contractuales y legales que correspondan.",
			},
		],
	},
	{
		title: "Uso permitido",
		blocks: [
			{ type: "p", text: "Los usuarios se comprometen a no:" },
			{
				type: "list",
				items: [
					"Utilizar la plataforma para actividades ilegales.",
					"Acceder sin autorización a cuentas o información de terceros.",
					"Introducir programas maliciosos o interferir en el funcionamiento del sistema.",
					"Manipular pedidos, pagos o registros de manera fraudulenta.",
					"Reproducir, distribuir o explotar indebidamente el software.",
					"Utilizar las herramientas de forma contraria a estos términos o a la normativa aplicable.",
				],
			},
			{
				type: "p",
				text: "Ante incumplimientos graves, Tappealo podrá adoptar medidas proporcionales de seguridad, incluyendo la restricción de determinados accesos, respetando los derechos contractuales y legales correspondientes.",
			},
		],
	},
	{
		title: "Propiedad intelectual",
		blocks: [
			{
				type: "p",
				text: "El software, diseño, estructura, código, documentación, marca e identidad visual propios de Tappealo se encuentran protegidos por la legislación de propiedad intelectual aplicable.",
			},
			{
				type: "p",
				text: "La contratación del servicio no implica una transferencia de propiedad sobre el software.",
			},
			{
				type: "p",
				text: "Los restaurantes conservarán los derechos que les correspondan sobre sus marcas, imágenes, menús y demás contenidos propios cargados en la plataforma.",
			},
		],
	},
	{
		title: "Protección de datos personales",
		blocks: [
			{
				type: "p",
				text: "El tratamiento de datos personales se regirá por la Política de Privacidad de Tappealo y por la normativa vigente.",
			},
			{
				type: "p",
				text: "Los restaurantes deberán utilizar la información a la que accedan exclusivamente para finalidades legítimas y autorizadas.",
			},
			{
				type: "p",
				text: "Para obtener más información, los usuarios podrán consultar la Política de Privacidad disponible en el sitio web.",
			},
		],
	},
	{
		title: "Responsabilidad y limitaciones",
		blocks: [
			{ type: "p", text: "Tappealo es una herramienta tecnológica de apoyo a la operación gastronómica." },
			{
				type: "p",
				text: "Las responsabilidades por errores técnicos, incumplimientos contractuales o daños se determinarán de acuerdo con la intervención efectiva de cada parte y la legislación aplicable.",
			},
			{
				type: "p",
				text: "Ninguna disposición de estos términos pretende excluir responsabilidades que legalmente no puedan ser limitadas ni restringir los derechos reconocidos a los consumidores.",
			},
		],
	},
	{
		title: "Modificaciones de la plataforma y de los términos",
		blocks: [
			{ type: "p", text: "Tappealo podrá introducir mejoras, actualizaciones y nuevas funcionalidades." },
			{
				type: "p",
				text: "Las modificaciones sustanciales de los servicios contratados o de estos términos se comunicarán de manera adecuada y respetarán los derechos adquiridos, las condiciones contractuales y la normativa vigente.",
			},
		],
	},
	{
		title: "Legislación aplicable",
		blocks: [
			{
				type: "p",
				text: "Estos Términos y Condiciones se interpretarán de conformidad con las leyes de la República Argentina.",
			},
			{
				type: "p",
				text: "Las controversias estarán sujetas a los mecanismos y autoridades competentes conforme a la legislación vigente, sin afectar los derechos de los consumidores ni las reglas imperativas de jurisdicción.",
			},
		],
	},
	{
		title: "Contacto y atención al usuario",
		blocks: [
			{
				type: "p",
				text: "Para consultas comerciales, soporte técnico o reclamos relacionados con la plataforma:",
			},
			{
				type: "list",
				items: [
					"Nombre comercial: Tappealo",
					"Sitio web: https://www.tappealo.com",
					"Correo electrónico: contacto@tappealo.com",
					"Titular o razón social: Pilar Elisii",
				],
			},
			{
				type: "p",
				text: "Los reclamos vinculados directamente con la preparación, entrega o características de los productos gastronómicos podrán dirigirse también al restaurante responsable.",
			},
		],
	},
];

export default function Terms() {
	return (
		<LegalPage
			title="Términos y Condiciones de Uso"
			documentTitle="Términos y Condiciones | Tappealo"
			description="Términos y condiciones de uso de Tappealo, la plataforma de menús digitales QR y gestión de pedidos para restaurantes."
			updatedAt="24 de octubre de 2026"
			sections={sections}
			closing="Tappealo — Tecnología para una experiencia gastronómica más simple, ágil y conectada."
		/>
	);
}
