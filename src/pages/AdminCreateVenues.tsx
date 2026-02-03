import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Store, Phone, MapPin, Link2 } from "lucide-react";

import tappealoLogo from "@/assets/tappealo-logo.png";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { httpsCallable } from "firebase/functions";
import { fbFunctions } from "@/integrations/firebase/client";
import { toast } from "sonner";

function normSlugClient(s: string) {
	return s
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-_]/g, "")
		.replace(/--+/g, "-");
}

export default function AdminCreateVenue() {
	const navigate = useNavigate();
	const { loading, isAuthenticated, isAdmin } = useAdminUsers();

	const [saving, setSaving] = useState(false);

	// required
	const [slug, setSlug] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");

	// optional
	const [phone, setPhone] = useState("");
	const [location_link, setLocationLink] = useState("");
	const [address_1, setAddress1] = useState("");
	const [address_2, setAddress2] = useState("");
	const [social_link, setSocialLink] = useState("");

	useEffect(() => {
		if (!loading && (!isAuthenticated || !isAdmin)) {
			navigate("/login-admin", { replace: true });
		}
	}, [loading, isAuthenticated, isAdmin, navigate]);

	if (loading) {
		return (
			<div className="min-h-screen bg-background flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isAuthenticated || !isAdmin) return null;

	const handleCreate = async () => {
		const s = normSlugClient(slug);
		if (!s) return toast.error("Slug es obligatorio");
		if (!name.trim()) return toast.error("Nombre es obligatorio");
		if (!email.trim()) return toast.error("Correo es obligatorio");
		if (password.trim().length < 6)
			return toast.error("Contraseña mínimo 6 caracteres");

		setSaving(true);
		try {
			const fn = httpsCallable(fbFunctions, "adminCreateVenue");
			const res: any = await fn({
				slug: s,
				name: name.trim(),
				email: email.trim().toLowerCase(),
				password: password.trim(),
				phone: phone.trim() || null,
				location_link: location_link.trim() || null,
				address_1: address_1.trim() || null,
				address_2: address_2.trim() || null,
				social_link: social_link.trim() || null,
			});

			toast.success("Comercio creado ✅");
			// volver al listado
			navigate("/admin", { replace: true });
		} catch (e: any) {
			console.error(e);
			toast.error(e?.message || "Error creando comercio");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate("/admin")}
					>
						<ArrowLeft className="h-5 w-5" />
					</Button>
					<img src={tappealoLogo} alt="Tappealo" className="h-10" />
				</div>
			</header>

			<main className="px-6 py-8 max-w-4xl mx-auto">
				<div className="flex items-center gap-3 mb-8">
					<Store className="h-8 w-8 text-primary" />
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							Crear comercio
						</h1>
						<p className="text-muted-foreground">Auth + Venue en Firestore</p>
					</div>
				</div>

				<div className="bg-card border border-border rounded-lg p-6 mb-8">
					<div className="space-y-4">
						{/* Slug */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Store className="h-4 w-4" />
								Slug *
							</Label>
							<Input
								value={slug}
								onChange={(e) => setSlug(e.target.value)}
								placeholder="labici"
								className="max-w-xl"
							/>
							<p className="text-xs text-muted-foreground">
								Se normaliza automáticamente (minusculas, sin espacios).
							</p>
						</div>

						{/* Email */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Store className="h-4 w-4" />
								Correo *
							</Label>
							<Input
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="correo@comercio.com"
								className="max-w-xl"
							/>
						</div>

						{/* Password */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Store className="h-4 w-4" />
								Contraseña *
							</Label>
							<Input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="mínimo 6 caracteres"
								className="max-w-xl"
							/>
						</div>

						{/* Name */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Store className="h-4 w-4" />
								Nombre *
							</Label>
							<Input
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="La Bici"
								className="max-w-xl"
							/>
						</div>

						{/* Phone */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Phone className="h-4 w-4" />
								Teléfono
							</Label>
							<Input
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								placeholder="+54 9 11 1234-5678"
								className="max-w-xs"
							/>
						</div>

						{/* Maps */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Link a Google Maps
							</Label>
							<Input
								value={location_link}
								onChange={(e) => setLocationLink(e.target.value)}
								placeholder="https://maps.google.com/..."
								className="max-w-xl"
							/>
						</div>

						{/* Address 1 */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Dirección 1
							</Label>
							<Input
								value={address_1}
								onChange={(e) => setAddress1(e.target.value)}
								placeholder="Calle 9 3666"
								className="max-w-xl"
							/>
						</div>

						{/* Address 2 */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Dirección 2
							</Label>
							<Input
								value={address_2}
								onChange={(e) => setAddress2(e.target.value)}
								placeholder="Piso / Local / Referencia"
								className="max-w-xl"
							/>
						</div>

						{/* Social */}
						<div className="space-y-2">
							<Label className="flex items-center gap-2">
								<Link2 className="h-4 w-4" />
								Redes
							</Label>
							<Input
								value={social_link}
								onChange={(e) => setSocialLink(e.target.value)}
								placeholder="https://instagram.com/tucomercio"
								className="max-w-xl"
							/>
						</div>
					</div>
				</div>

				<Button onClick={handleCreate} disabled={saving} className="gap-2">
					{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
					Crear comercio
				</Button>
			</main>
		</div>
	);
}
