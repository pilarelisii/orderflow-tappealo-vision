import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import tappealoLogo from "@/assets/tappealo-logo.png";

export type LegalBlock =
	| { type: "p"; text: string }
	| { type: "list"; items: string[] }
	| { type: "subtitle"; text: string }
	| { type: "definition"; term: string; text: string };

export type LegalSection = { title: string; blocks: LegalBlock[] };

type Props = {
	title: string;
	documentTitle: string;
	description: string;
	updatedAt: string;
	sections: LegalSection[];
	closing: string;
};

const LINK_RE = /(https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.]+)/g;

/** Convierte URLs y emails del texto legal en links. */
function withLinks(text: string) {
	return text.split(LINK_RE).map((part, i) => {
		if (!part.match(LINK_RE)) return part;
		const href = part.includes("@") ? `mailto:${part}` : part;
		return (
			<a key={i} href={href} className="font-semibold text-[#5a351f] underline underline-offset-2 break-all">
				{part}
			</a>
		);
	});
}

const slugify = (s: string) =>
	s
		.toLowerCase()
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");

/** Página legal (privacidad / términos) con el estilo de la landing. */
export default function LegalPage({ title, documentTitle, description, updatedAt, sections, closing }: Props) {
	useEffect(() => {
		document.title = documentTitle;
		const meta = document.querySelector('meta[name="description"]');
		const prev = meta?.getAttribute("content");
		meta?.setAttribute("content", description);
		window.scrollTo(0, 0);
		return () => {
			if (prev) meta?.setAttribute("content", prev);
		};
	}, [documentTitle, description]);

	return (
		<main className="min-h-screen bg-[#fff7ec] text-[#2b1a10]">
			<header className="border-b border-[#d8c2ad] bg-[#fff7ec]/90 backdrop-blur">
				<div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 md:px-8">
					<Link to="/" aria-label="Volver al inicio">
						<img src={tappealoLogo} alt="Tappealo" className="h-9" />
					</Link>
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-full border border-[#d8c2ad] px-4 py-2 text-sm font-bold text-[#5a351f] transition hover:bg-[#f6eadb]"
					>
						<ArrowLeft className="h-4 w-4" />
						Volver
					</Link>
				</div>
			</header>

			<article className="mx-auto max-w-4xl px-5 py-12 md:px-8 md:py-16">
				<p className="mb-3 text-sm font-black uppercase tracking-[0.25em] text-[#8b5a3c]">Legal</p>
				<h1 className="text-4xl font-black tracking-[-0.04em] text-[#2b1a10] md:text-5xl">{title}</h1>
				<p className="mt-4 text-sm text-[#7a6657]">Última actualización: {updatedAt}</p>

				<nav
					aria-label="Índice"
					className="mt-10 rounded-3xl border border-[#d8c2ad] bg-[#fffaf3] p-5 md:p-6"
				>
					<p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8b5a3c]">Contenido</p>
					<ol className="grid gap-1.5 text-sm md:grid-cols-2">
						{sections.map((s, i) => (
							<li key={s.title}>
								<a href={`#${slugify(s.title)}`} className="text-[#5f4a3b] hover:text-[#2b1a10] hover:underline">
									{i + 1}. {s.title}
								</a>
							</li>
						))}
					</ol>
				</nav>

				<div className="mt-10 space-y-10">
					{sections.map((s, i) => (
						<section key={s.title} id={slugify(s.title)} className="scroll-mt-6">
							<h2 className="mb-4 text-2xl font-black tracking-[-0.03em] text-[#2b1a10]">
								{i + 1}. {s.title}
							</h2>
							<div className="space-y-4 text-[15px] leading-7 text-[#5f4a3b]">
								{s.blocks.map((b, j) => {
									if (b.type === "p") return <p key={j}>{withLinks(b.text)}</p>;
									if (b.type === "subtitle")
										return (
											<h3 key={j} className="pt-2 font-bold text-[#2b1a10]">
												{b.text}
											</h3>
										);
									if (b.type === "definition")
										return (
											<p key={j}>
												<strong className="text-[#2b1a10]">{b.term}:</strong> {withLinks(b.text)}
											</p>
										);
									return (
										<ul key={j} className="list-disc space-y-1.5 pl-6 marker:text-[#8b5a3c]">
											{b.items.map((it) => (
												<li key={it}>{withLinks(it)}</li>
											))}
										</ul>
									);
								})}
							</div>
						</section>
					))}
				</div>

				<p className="mt-14 border-t border-[#d8c2ad] pt-8 text-center font-bold text-[#5a351f]">{closing}</p>
			</article>

			<LegalFooter />
		</main>
	);
}

export function LegalFooter() {
	return (
		<footer className="border-t border-[#d8c2ad] px-5 py-8 text-center text-sm text-[#7a6657] md:px-8">
			<div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
				<span>© Tappealo 2026</span>
				<span aria-hidden>·</span>
				<Link to="/privacidad" className="hover:text-[#2b1a10] hover:underline">
					Política de privacidad
				</Link>
				<span aria-hidden>·</span>
				<Link to="/terminos" className="hover:text-[#2b1a10] hover:underline">
					Términos y condiciones
				</Link>
			</div>
		</footer>
	);
}
