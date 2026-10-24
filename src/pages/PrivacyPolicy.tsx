import LegalPage, { type LegalSection } from "@/components/LegalPage";

const sections: LegalSection[] = [
	{
		title: "Introducción",
		blocks: [
			{
				type: "p",
				text: "En Tappealo nos comprometemos a proteger la privacidad y los datos personales de quienes utilizan nuestra plataforma.",
			},
			{
				type: "p",
				text: "Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos la información de los restaurantes que contratan nuestros servicios y de los clientes que interactúan con nuestros menús digitales, sistemas de pedidos y herramientas de pago.",
			},
			{
				type: "p",
				text: "El tratamiento de datos personales se realiza de conformidad con la legislación aplicable en la República Argentina, incluyendo la Ley N.º 25.326 de Protección de Datos Personales y sus normas complementarias.",
			},
		],
	},
	{
		title: "Responsable del tratamiento de datos",
		blocks: [
			{ type: "p", text: "La plataforma Tappealo es administrada por:" },
			{
				type: "list",
				items: [
					"Nombre comercial: Tappealo",
					"Titular o razón social: Pilar Elisii.",
					"CUIT: 27-46017803-2",
					"Correo electrónico de privacidad: pilarelisii5@gmail.com",
					"Sitio web: https://www.tappealo.com",
				],
			},
		],
	},
	{
		title: "Información que recopilamos",
		blocks: [
			{
				type: "p",
				text: "Según la forma en que los usuarios interactúen con la plataforma, podremos recopilar las siguientes categorías de información:",
			},
			{ type: "subtitle", text: "Información de los restaurantes:" },
			{
				type: "list",
				items: [
					"Nombre comercial y datos de contacto.",
					"Información de sus responsables y usuarios autorizados.",
					"Datos necesarios para la administración de cuentas.",
					"Información sobre productos, menús, precios y pedidos.",
					"Información relacionada con la contratación y facturación del servicio.",
				],
			},
			{ type: "subtitle", text: "Información de los clientes de restaurantes:" },
			{
				type: "list",
				items: [
					"Datos proporcionados voluntariamente durante la realización de pedidos.",
					"Productos seleccionados y detalles del pedido.",
					"Identificación de la mesa o modalidad de consumo.",
					"Información necesaria para gestionar el estado de los pedidos.",
					"Datos relacionados con las transacciones, cuando corresponda.",
				],
			},
			{ type: "subtitle", text: "Información técnica y de navegación:" },
			{
				type: "list",
				items: [
					"Dirección IP y datos técnicos del dispositivo.",
					"Tipo de navegador y sistema operativo.",
					"Páginas visitadas e interacciones con la plataforma.",
					"Información obtenida mediante cookies y tecnologías similares, cuando se encuentren habilitadas.",
				],
			},
			{
				type: "p",
				text: "La recopilación de estos datos dependerá de las funciones efectivamente utilizadas y de las configuraciones implementadas.",
			},
		],
	},
	{
		title: "Finalidad del tratamiento",
		blocks: [
			{ type: "p", text: "La información recopilada podrá utilizarse para:" },
			{
				type: "list",
				items: [
					"Proporcionar y mantener los servicios de Tappealo.",
					"Gestionar cuentas de restaurantes y sus usuarios autorizados.",
					"Registrar, procesar y visualizar pedidos.",
					"Facilitar la comunicación operativa entre clientes, cocina y personal del restaurante.",
					"Gestionar las funcionalidades relacionadas con los pagos.",
					"Brindar soporte técnico y atención a consultas.",
					"Mejorar el funcionamiento, rendimiento y seguridad de la plataforma.",
					"Realizar análisis estadísticos de uso.",
					"Medir la efectividad de campañas publicitarias cuando corresponda y exista la habilitación legal necesaria.",
					"Cumplir con obligaciones legales y contractuales.",
				],
			},
			{
				type: "p",
				text: "Los datos no serán utilizados para finalidades incompatibles con aquellas informadas al momento de su recopilación.",
			},
		],
	},
	{
		title: "Bases legales y consentimiento",
		blocks: [
			{
				type: "p",
				text: "Tappealo tratará los datos personales conforme a las condiciones y bases permitidas por la legislación argentina, incluyendo el consentimiento cuando resulte necesario y las excepciones legalmente previstas.",
			},
			{
				type: "p",
				text: "Cuando un tratamiento requiera consentimiento, se proporcionará información adecuada para que el usuario pueda decidir libremente.",
			},
		],
	},
	{
		title: "Servicios de terceros",
		blocks: [
			{
				type: "p",
				text: "Para el funcionamiento de la plataforma, Tappealo podrá utilizar servicios tecnológicos externos, entre ellos:",
			},
			{
				type: "definition",
				term: "Google Firebase",
				text: "para funcionalidades de almacenamiento, autenticación, gestión de información y servicios de infraestructura, según los componentes implementados.",
			},
			{
				type: "definition",
				term: "Proveedores de pagos",
				text: "para gestionar pagos electrónicos cuando esta funcionalidad esté disponible. Los datos de pago serán tratados según la integración implementada y las políticas del proveedor correspondiente.",
			},
			{
				type: "definition",
				term: "Google Ads y herramientas de medición",
				text: "para analizar el rendimiento de campañas publicitarias y registrar conversiones, conforme a las configuraciones de seguimiento habilitadas.",
			},
			{
				type: "p",
				text: "Estos servicios podrán tratar datos de acuerdo con sus propias políticas y las condiciones contractuales aplicables.",
			},
		],
	},
	{
		title: "Cookies y tecnologías de seguimiento",
		blocks: [
			{ type: "p", text: "Tappealo podrá utilizar cookies y tecnologías similares para:" },
			{
				type: "list",
				items: [
					"Mantener el funcionamiento de la plataforma.",
					"Recordar determinadas preferencias.",
					"Analizar el uso y rendimiento del sitio.",
					"Medir resultados de campañas publicitarias.",
				],
			},
			{
				type: "p",
				text: "Cuando se utilicen herramientas publicitarias como Google Ads, se informará sobre las tecnologías de seguimiento y se solicitará el consentimiento que corresponda conforme a la normativa aplicable.",
			},
			{
				type: "p",
				text: "Los usuarios podrán administrar determinadas preferencias mediante las herramientas disponibles en el sitio y la configuración de su navegador.",
			},
		],
	},
	{
		title: "Seguridad de la información",
		blocks: [
			{
				type: "p",
				text: "Tappealo adoptará medidas técnicas y organizativas razonables para proteger los datos personales frente al acceso no autorizado, la pérdida, la alteración o la divulgación indebida.",
			},
			{
				type: "p",
				text: "Entre estas medidas podrán incluirse controles de acceso, autenticación de usuarios, conexiones seguras y restricciones de permisos sobre la información almacenada.",
			},
			{
				type: "p",
				text: "Ningún sistema tecnológico puede garantizar una seguridad absoluta. Ante incidentes, se evaluarán las medidas de contención y comunicación que correspondan.",
			},
		],
	},
	{
		title: "Conservación de datos",
		blocks: [
			{
				type: "p",
				text: "Los datos personales se conservarán únicamente durante el tiempo necesario para cumplir las finalidades informadas y las obligaciones legales o contractuales aplicables.",
			},
			{
				type: "p",
				text: "Cuando la información deje de ser necesaria, se procederá a su eliminación, anonimización o tratamiento conforme a las disposiciones vigentes, salvo que exista una obligación legítima de conservación.",
			},
		],
	},
	{
		title: "Derechos de los titulares",
		blocks: [
			{
				type: "p",
				text: "Los titulares de datos personales podrán ejercer los derechos de acceso, rectificación, actualización y supresión de acuerdo con la Ley N.º 25.326.",
			},
			{ type: "p", text: "Para realizar una solicitud deberán comunicarse a: pilarelisii5@gmail.com" },
			{
				type: "p",
				text: "Podrá solicitarse la información razonablemente necesaria para verificar la identidad del solicitante y evitar el acceso de terceros no autorizados.",
			},
			{
				type: "p",
				text: "La Agencia de Acceso a la Información Pública es el organismo de control competente en materia de protección de datos personales en Argentina y recibe denuncias y reclamos vinculados con el incumplimiento de la normativa.",
			},
		],
	},
	{
		title: "Tratamiento de datos por parte de los restaurantes",
		blocks: [
			{
				type: "p",
				text: "Los restaurantes que utilizan Tappealo podrán acceder a información necesaria para gestionar pedidos y prestar sus propios servicios gastronómicos.",
			},
			{
				type: "p",
				text: "Cada restaurante será responsable del tratamiento de los datos personales que realice para sus propias finalidades, conforme a la normativa aplicable.",
			},
			{
				type: "p",
				text: "La distribución específica de responsabilidades entre Tappealo y los restaurantes estará determinada por las operaciones efectivamente realizadas y los acuerdos correspondientes.",
			},
		],
	},
	{
		title: "Transferencias internacionales",
		blocks: [
			{
				type: "p",
				text: "Algunos proveedores tecnológicos pueden almacenar o procesar información fuera de Argentina.",
			},
			{
				type: "p",
				text: "Cuando se efectúen transferencias internacionales de datos personales, Tappealo procurará cumplir con las condiciones y garantías exigidas por la normativa vigente.",
			},
		],
	},
	{
		title: "Modificaciones",
		blocks: [
			{
				type: "p",
				text: "Tappealo podrá actualizar esta Política de Privacidad para reflejar cambios legales, tecnológicos u operativos.",
			},
			{
				type: "p",
				text: "Las modificaciones serán publicadas en el sitio web indicando la fecha de actualización. Cuando corresponda, se realizarán comunicaciones adicionales o se solicitará un nuevo consentimiento.",
			},
		],
	},
	{
		title: "Contacto",
		blocks: [
			{
				type: "p",
				text: "Ante consultas relacionadas con esta Política de Privacidad o el tratamiento de datos personales, los usuarios podrán comunicarse a:",
			},
			{ type: "p", text: "contacto@tappealo.com" },
		],
	},
];

export default function PrivacyPolicy() {
	return (
		<LegalPage
			title="Política de Privacidad"
			documentTitle="Política de Privacidad | Tappealo"
			description="Cómo Tappealo recopila, utiliza, almacena y protege los datos personales de restaurantes y clientes, conforme a la Ley N.º 25.326."
			updatedAt="24 de octubre de 2026"
			sections={sections}
			closing="Tappealo — Digitalizando la experiencia gastronómica."
		/>
	);
}
