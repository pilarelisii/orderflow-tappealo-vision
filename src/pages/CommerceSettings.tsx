import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Switch } from "@/components/ui/switch";
import { usePaymentMethods } from "@/hooks/usePaymentMehtods";
import {
	Loader2,
	ArrowLeft,
	Store,
	MapPin,
	Phone,
	Link2,
	Upload,
	ImageIcon,
	CreditCard,
	Eye,
	EyeOff,
	NotebookPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import tappealoLogo from "@/assets/tappealo-logo.png";

import { db, storage } from "@/integrations/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import FullScreenLoader from "@/components/FullScreenLoader";
import { Textarea } from "@/components/ui/textarea";

const isImage = (f: File) => f.type?.startsWith("image/")
const max5mb = (f: File) => f.size <= 5 * 1024 * 1024;

const isMapsShortLink = (url: string) => /maps\.app\.goo\.gl/i.test(url.trim());

async function resolveGoogleMapsUrl(input: string): Promise<string> {
	const url = input.trim();

	// si no parece link, devolvemos como está
	if (!/^https?:\/\//i.test(url)) return url;

	// Si NO es short link, listo
	if (!isMapsShortLink(url)) return url;

	// Si es short link: seguimos redirects
	// OJO: usamos fetch con redirect: "follow"
	const res = await fetch(url, { redirect: "follow" });

	// en la mayoría de browsers res.url queda con la URL final
	const finalUrl = res.url || url;

	return finalUrl;
}

function fileToDataUrl(file: File): Promise<string> {
	try {
		return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(file);
		});
	} catch (e) {
		console.error(e);
		return Promise.reject(e);
	}
	
}

// (opcional) preparar embed (solo para google.com/maps…)
function toGoogleMapsEmbed(url: string): string | null {
	try {
		const u = new URL(url);
		if (!u.hostname.includes("google.") || !u.pathname.includes("/maps"))
			return null;

		// Si ya es embed
		if (u.pathname.includes("/maps/embed")) return u.toString();

		u.searchParams.set("output", "embed");
		return u.toString();
	} catch {
		return null;
	}
}

const ComercioSettings = () => {
	const navigate = useNavigate();
	const { isAuthenticated, loading: authLoading, venue } = useAuth();

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
  	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// ✅ campos
	const [venueName, setVenueName] = useState("");
	const [venuePhone, setVenuePhone] = useState("");
	const [googleMapsUrl, setGoogleMapsUrl] = useState("");
	const [address1, setAddress1] = useState("");
	const [address2, setAddress2] = useState("");
	const [socialLink, setSocialLink] = useState("");
	const [mpPublicKey, setMpPublicKey] = useState("");
	const [mpAccessToken, setMpAccessToken] = useState("");
	const [showAccessToken, setShowAccessToken] = useState(false);
	const [additionalContent, setAdditionalContent] = useState("");
	const [phone_client, setPhoneClient] = useState(true);
	const [calls, setCalls] = useState(true);

	// ✅ logo
	const [logoUrl, setLogoUrl] = useState<string>("");
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [logoPreview, setLogoPreview] = useState<string>("");

	useEffect(() => {
		if (!authLoading && !isAuthenticated) navigate("/login");
	}, [authLoading, isAuthenticated, navigate]);

	const {
		loading: payLoading,
		isEnabled,
		getByType,
		toggle,
		saveMPData,
	} = usePaymentMethods(venue?.id);

	// precargar credenciales desde payment_types (MP)
	useEffect(() => {
		const mp = getByType.get("MP");
		const d: any = mp?.payment_data || {};
		setMpPublicKey(String(d.mp_public_key || ""));
		setMpAccessToken(String(d.mp_access_token || ""));
	}, [getByType]);


	useEffect(() => {
		const fetchVenueData = async () => {
			if (!venue?.id) return;
			
			setLoading(true);
			try {
				const snap = await getDoc(doc(db, "venues", venue.id));
				if (!snap.exists()) throw new Error("Venue no existe en Firestore");

				const data = snap.data() as any;

				setVenueName((data.name || "").toString());
				setVenuePhone((data.phone || "").toString());
				setGoogleMapsUrl((data.location_link || "").toString());
				setAddress1((data.address_1 || "").toString());
				setAddress2((data.address_2 || "").toString());
				setSocialLink((data.social_link || "").toString());
				setAdditionalContent((data.additional_content || "").toString());
				setCalls(data.calls ?? true);
				setPhoneClient(data.phone_client ?? true);
				
				const existingLogo = (data.logo_url || "").toString();
				setLogoUrl(existingLogo);
				setLogoPreview(existingLogo);
			} catch (error) {
				console.error("Error fetching venue data:", error);
				toast.error("Error al cargar los datos del comercio");
			} finally {
				setLoading(false);
			}
		};

		fetchVenueData();
	}, [venue?.id]);

	async function compressImageToDataUrl(
		file: File,
		maxWidth = 400,
		quality = 0.75
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const img = new Image();
			const reader = new FileReader();

			reader.onload = () => {
				img.onload = () => {
					const scale = Math.min(1, maxWidth / img.width);
					const canvas = document.createElement("canvas");

					canvas.width = Math.round(img.width * scale);
					canvas.height = Math.round(img.height * scale);

					const ctx = canvas.getContext("2d");
					if (!ctx) return reject(new Error("No se pudo procesar la imagen"));

					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					const mimeType =
						file.type === "image/png" ? "image/png" : "image/jpeg";

					const dataUrl = canvas.toDataURL(mimeType, quality);

					if (dataUrl.length > 900_000) {
						return reject(
							new Error("LOGO_DATA_URL_TOO_LARGE")
						);
					}

					resolve(dataUrl);
				};

				img.onerror = reject;
				img.src = String(reader.result);
			};

			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
	}

	const handleLogoSelect = (file: File) => {
		if (!isImage(file)) {
			toast.error("Solo se permiten imágenes");
			return;
		}
		if (!max5mb(file)) {
			toast.error("La imagen no puede superar 5MB");
			return;
		}

		// liberar preview anterior si era blob
		if (logoPreview?.startsWith("blob:")) URL.revokeObjectURL(logoPreview);

		const preview = URL.createObjectURL(file);
		setLogoFile(file);
		setLogoPreview(preview);
	};


	const handleSave = async () => {
		if (!venue?.id) return;

		setSaving(true);
		try {
			let nextLogoUrl: string | null = logoUrl?.trim() || null;
			let nextLogoPath: string | null = null;
			let nextLogoDataUrl: string | null = null;
			// 1) Normalizar Maps
			let normalizedMapsUrl: string | null = googleMapsUrl.trim() || null;
			if (normalizedMapsUrl) {
				try {
					normalizedMapsUrl = await resolveGoogleMapsUrl(normalizedMapsUrl);
				} catch {
				//	toast.warning("No pude normalizar el link. Se guardará como está.");
				}
			}
			const location_embed = normalizedMapsUrl
				? toGoogleMapsEmbed(normalizedMapsUrl)
				: null;

			// 2) Subir logo primero (si hay archivo)
			if (logoFile) {
				try {
					nextLogoDataUrl = await compressImageToDataUrl(logoFile);
					const ext = (logoFile.name.split(".").pop() || "jpg").toLowerCase();
					const path = `venues/${venue.id}/logo/logo.${ext}`;
					const fileRef = ref(storage, path);

					await uploadBytes(fileRef, logoFile, {
						contentType: logoFile.type || "image/jpeg",
						cacheControl: "public,max-age=31536000",
					});



					nextLogoUrl = await getDownloadURL(fileRef);
					nextLogoPath = path;

				} catch (err: any) {
					console.error("ERROR SUBIENDO LOGO:", err);
					throw err;
				}
			}

			// 3) Guardar venue (una sola vez)
			await updateDoc(doc(db, "venues", venue.id), {
				name: venueName.trim() || null,
				phone: venuePhone.trim() || null,
				address_1: address1.trim() || null,
				address_2: address2.trim() || null,
				social_link: socialLink.trim() || null,
				additional_content: additionalContent.trim() || null,
				phone_client: phone_client,
				calls: calls,

				location_link: normalizedMapsUrl,
				location_embed,

				logo_url: nextLogoUrl,
				...(nextLogoPath ? { logo_path: nextLogoPath } : {}),
				logo_data_url: nextLogoDataUrl,

				updated_at: serverTimestamp(),
			});

			// 4) Guardar MP si aplica
			if (isEnabled("MP")) {
				if (!mpPublicKey.trim() || !mpAccessToken.trim()) {
					toast.error("Completá Public Key y Access Token de Mercado Pago");
					return;
				}
				await saveMPData(mpPublicKey.trim(), mpAccessToken.trim());
			}

			// 5) refrescar state
			setGoogleMapsUrl(normalizedMapsUrl || "");
			setLogoUrl(nextLogoUrl || "");
			setLogoFile(null);

			toast.success("Datos del comercio actualizados");
		} catch (error: any) {
				console.error("Error updating commerce data:", error);

				if (error?.message === "LOGO_DATA_URL_TOO_LARGE") {
					toast.error("El logo es demasiado pesado. Probá subir una imagen más simple o más liviana.");
					return;
				}

				if (
					error?.message?.includes("longer than") ||
					error?.message?.includes("1048487 bytes")
				) {
					toast.error("El logo excede el tamaño máximo permitido para generar PDFs.");
					return;
				}

				toast.error("Error al actualizar los datos del comercio");
			} finally {
			setSaving(false);
		}
	};

	const renderPlan = () => {
		const text = `Posees el plan `;
		switch (venue?.plan) {
			case "premium":
				return text +`PREMIUM`;
			case "pro":
				return text + "PRO";
			case "basico":
				return text + "BASICO";
			case "demo": 
				return "Actualmente estas utilizando una Demo";
			case "trial":
				return "Utilizando prueba gratuita";
			default: 
				return "Actualmente no estas utilizando ningun plan";
		}
	}

	if (authLoading || loading) {
		return (
			<FullScreenLoader/>
		);
	}
	if (!isAuthenticated) return null;

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" asChild>
						<Link to="/panel">
							<ArrowLeft className="h-5 w-5" />
						</Link>
					</Button>
					<img src={tappealoLogo} alt="Tappealo" className="w-16" />
				</div>
			</header>

			<main className="px-6 py-8 max-w-4xl mx-auto">
				<div className="flex items-center gap-3 mb-8">
					<Store className="h-8 w-8 text-primary" />
					<div>
						<h1 className="text-2xl font-bold text-foreground">Comercio</h1>
						<p className="text-muted-foreground">
							Información del local para mostrar en el menú
						</p>
					</div>
				</div>
				<div className="bg-card border border-border rounded-lg p-6 mt-6 mb-6">
					<div className="flex items-center justify-between py-3">
						<div>
							<p className="font-semibold text-foreground">{renderPlan()}</p>
						</div>
						<a
							href={`https://wa.me/542212021296/?text=Hola!%20soy%20${
								venue?.name || "un%20comercio"
							}%20y%20me%20gustaria%20cambiar%20de%20plan`}
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-2xl border border-[#5a351f] bg-[#fdfbf9] px-5 py-3 text-sm font-bold text-[#5a351f] transition hover:scale-[1.03] block"
						>
							Cambiar plan
						</a>
					</div>
				</div>
				<div className="bg-card border border-border rounded-lg p-6 mb-8">
					<div className="space-y-4">
						{/* Logo */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<ImageIcon className="h-4 w-4" />
								Logo del comercio
							</Label>

							<div className="flex items-center gap-4">
								<div className="w-20 h-20 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
									{logoPreview ? (
										<img
											src={logoPreview}
											alt="Logo"
											className="w-full h-full object-cover"
										/>
									) : (
										<ImageIcon className="h-6 w-6 text-muted-foreground" />
									)}
								</div>

								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={(e) => {
										const file = e.target.files?.[0];
										if (file) handleLogoSelect(file);
										// ✅ permite volver a elegir el mismo archivo y que dispare change
										e.currentTarget.value = "";
									}}
								/>

								<Button
									type="button"
									variant="outline"
									onClick={() => fileInputRef.current?.click()}
								>
									<Upload className="h-4 w-4 mr-2" />
									Subir logo
								</Button>
							</div>

							<p className="text-xs text-muted-foreground">
								PNG/JPG. Máximo 5MB.
							</p>
						</div>

						{/* Nombre */}
						<div className="space-y-2">
							<Label htmlFor="venue-name" className="flex items-center gap-2">
								<Store className="h-4 w-4" />
								Nombre
							</Label>
							<Input
								id="venue-name"
								placeholder="Mi Café"
								value={venueName}
								onChange={(e) => setVenueName(e.target.value)}
								className="max-w-xl"
							/>
						</div>

						{/* Teléfono */}
						<div className="space-y-2">
							<Label htmlFor="venue-phone" className="flex items-center gap-2">
								<Phone className="h-4 w-4" />
								Celular / Teléfono
							</Label>
							<Input
								id="venue-phone"
								placeholder="+54 9 11 1234-5678"
								value={venuePhone}
								onChange={(e) => setVenuePhone(e.target.value)}
								className="max-w-xs"
							/>
						</div>

						{/* Google Maps */}
						<div className="space-y-2">
							<Label htmlFor="google-maps" className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Link a Google Maps
							</Label>
							<Input
								id="google-maps"
								placeholder="https://maps.google.com/..."
								value={googleMapsUrl}
								onChange={(e) => setGoogleMapsUrl(e.target.value)}
								className="max-w-xl"
							/>
							<p className="text-xs text-muted-foreground">
								Este enlace se mostrará para que los clientes puedan encontrar
								el local (especialmente útil para retiro)
							</p>
						</div>

						{/* Dirección 1 */}
						<div className="space-y-2">
							<Label htmlFor="address-1" className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Dirección 1
							</Label>
							<Input
								id="address-1"
								placeholder="Av. Siempre Viva 742"
								value={address1}
								onChange={(e) => setAddress1(e.target.value)}
								className="max-w-xl"
							/>
						</div>

						{/* Dirección 2 */}
						<div className="space-y-2">
							<Label htmlFor="address-2" className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Dirección 2
							</Label>
							<Input
								id="address-2"
								placeholder="Piso / Local / Referencia (opcional)"
								value={address2}
								onChange={(e) => setAddress2(e.target.value)}
								className="max-w-xl"
							/>
						</div>

						{/* Redes */}
						<div className="space-y-2">
							<Label htmlFor="social-link" className="flex items-center gap-2">
								<Link2 className="h-4 w-4" />
								Link a las redes sociales del comercio
							</Label>
							<Input
								id="social-link"
								placeholder="https://instagram.com/tucomercio"
								value={socialLink}
								onChange={(e) => setSocialLink(e.target.value)}
								className="max-w-xl"
							/>
							<p className="text-xs text-muted-foreground">
								Ej: Instagram, Linktree o tu web.
							</p>
						</div>
						{/* Adicionales */}
						<div className="space-y-2">
							<Label
								htmlFor="aditional-content"
								className="flex items-center gap-2"
							>
								<NotebookPen className="h-4 w-4" />
								Notas adicionales / Descripción
							</Label>

							<Textarea
								id="aditional-content"
								placeholder="Agregá información adicional sobre tu comercio"
								value={additionalContent}
								onChange={(e) => setAdditionalContent(e.target.value)}
								className="max-w-xl"
								maxLength={500}
							/>

							<p className="text-xs text-muted-foreground">
								Incluí aclaraciones, recomendaciones o información importante
								que quieras que vean tus clientes.
							</p>
						</div>

						{/* EF CAJA */}
						<div className="flex items-center justify-between py-3 border-b border-border">
							<div>
								<p className="font-medium text-foreground">
									Solicitar teléfono al cliente
								</p>
								<p className="text-xs text-muted-foreground">
									El teléfono del cliente se mostrará en el pedido y podrá
									utilizarse como medio de contacto.
								</p>
							</div>

							<Switch
								checked={phone_client}
								onCheckedChange={() => setPhoneClient(!phone_client)}
							/>
						</div>

						{/* EF MESA */}
						<div className="flex items-center justify-between py-3 border-b border-border">
							<div>
								<p className="font-medium text-foreground">
									Permitir llamados desde la mesa
								</p>
								<p className="text-xs text-muted-foreground">
									Los clientes podrán solicitar asistencia directamente desde su
									mesa.
								</p>
							</div>

							<Switch
								checked={calls}
								onCheckedChange={() => setCalls(!calls)}
							/>
						</div>
					</div>
				</div>
				<div className="bg-card border border-border rounded-lg p-6 mt-6">
					{/* Metodos de pago */}
					<div className="flex items-center gap-3 mb-4">
						<CreditCard className="h-6 w-6 text-primary" />
						<div>
							<h2 className="text-lg font-semibold text-foreground">
								Métodos de pago
							</h2>
							<p className="text-sm text-muted-foreground">
								Elegí cómo querés cobrar
							</p>
						</div>
					</div>

					{/* EF CAJA */}
					<div className="flex items-center justify-between py-3 border-b border-border">
						<div>
							<p className="font-medium text-foreground">
								Efectivo / Tarjeta en caja
							</p>
							<p className="text-xs text-muted-foreground">
								El cliente paga al retirar / recibir en la caja
							</p>
						</div>
						<Switch
							checked={isEnabled("EF_Counter")}
							onCheckedChange={(v) => toggle("EF_Counter", v)}
						/>
					</div>
					{/* EF MESA */}
					<div className="flex items-center justify-between py-3 border-b border-border">
						<div>
							<p className="font-medium text-foreground">
								Efectivo / Tarjeta en mesa
							</p>
							<p className="text-xs text-muted-foreground">
								El cliente paga al retirar / recibir desde su mesa
							</p>
						</div>
						<Switch
							checked={isEnabled("EF")}
							onCheckedChange={(v) => toggle("EF", v)}
						/>
					</div>
					{/* MP */}
					<div className="flex items-center justify-between py-3 border-b border-border">
						<div>
							<p className="font-medium text-foreground">Mercado Pago</p>
							<p className="text-xs text-muted-foreground">Pagos online</p>
						</div>
						<Switch
							checked={isEnabled("MP")}
							onCheckedChange={(v) => toggle("MP", v)}
							disabled={venue?.plan === "demo"}
						/>
					</div>

					{/* TD/TC disabled */}
					<div className="flex items-center justify-between py-3 border-b border-border opacity-60">
						<div>
							<p className="font-medium text-foreground">Tarjeta Débito</p>
							<p className="text-xs text-muted-foreground">Próximamente</p>
						</div>
						<Switch checked={false} disabled />
					</div>

					<div className="flex items-center justify-between py-3 opacity-60">
						<div>
							<p className="font-medium text-foreground">Tarjeta Crédito</p>
							<p className="text-xs text-muted-foreground">Próximamente</p>
						</div>
						<Switch checked={false} disabled />
					</div>

					{/* Credenciales MP: solo si MP está habilitado */}
					{isEnabled("MP") && (
						<div className="mt-6 space-y-4">
							<div className="space-y-2">
								<Label htmlFor="mp-public-key">Public Key</Label>
								<Input
									id="mp-public-key"
									placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
									value={mpPublicKey}
									onChange={(e) => setMpPublicKey(e.target.value)}
									className="max-w-xl font-mono text-sm"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="mp-access-token">Access Token</Label>
								<div className="relative max-w-xl">
									<Input
										id="mp-access-token"
										type={showAccessToken ? "text" : "password"}
										placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
										value={mpAccessToken}
										onChange={(e) => setMpAccessToken(e.target.value)}
										className="font-mono text-sm pr-10"
									/>
									<button
										type="button"
										onClick={() => setShowAccessToken(!showAccessToken)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
									>
										{showAccessToken ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>

								<p className="text-xs text-muted-foreground">
									Encontrá tus credenciales en{" "}
									<a
										href="https://www.mercadopago.com.ar/developers/panel/app"
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										Mercado Pago Developers
									</a>
								</p>
							</div>
						</div>
					)}
				</div>

				<div className="mt-6">
					<Button onClick={handleSave} disabled={saving}>
						{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
						Guardar
					</Button>
				</div>
			</main>
		</div>
	);
};

export default ComercioSettings;
