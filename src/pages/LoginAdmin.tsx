import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import tappealoLogo from "@/assets/tappealo-logo.png";
import { Loader2 } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { Link } from "react-router-dom";
export default function LoginAdmin() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	const navigate = useNavigate();
	const { toast } = useToast();

	const { signInAdmin, loading, isAdmin, isAuthenticated } = useAdminUsers();

	// ✅ si está logueado y es admin => dashboard
	useEffect(() => {
		if (!loading && isAuthenticated && isAdmin) {
			navigate("/admin", { replace: true });
		}
	}, [loading, isAuthenticated, isAdmin, navigate]);

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email.trim() || !password.trim()) {
			toast({
				title: "Error",
				description: "Ingresá email y contraseña",
				variant: "destructive",
			});
			return;
		}

		const { error } = await signInAdmin(email.trim(), password.trim());

		if (error) {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			});
			return;
		}

		// ⚠️ IMPORTANTE:
		// NO navegamos acá manualmente.
		// Esperamos a que onAuthStateChanged + Firestore validen role=admin.
	};

	return (
		<div className="min-h-screen bg-background flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="flex flex-col items-center justify-center pb-2">
					<img
						src={tappealoLogo}
						alt="Tappealo"
						className="h-16 object-contain"
					/>
					<p className="text-sm text-muted-accent mt-2">
						Panel de Administrador
					</p>
				</CardHeader>

				<CardContent>
					<form onSubmit={handleLogin} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="correo@ejemplo.com"
								required
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="password">Contraseña</Label>
							<Input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								required
							/>
						</div>

						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Verificando...
								</>
							) : (
								"Ingresar"
							)}
						</Button>

						<Button asChild variant="link" className="w-full">
							<Link to="/login">
								Panel de Gestión
							</Link>
						</Button>
						{/* ✅ feedback claro si logueó pero NO es admin */}
						{!loading && isAuthenticated && !isAdmin && (
							<p className="text-sm text-red-600 mt-2">
								Tu usuario no tiene permisos de administrador.
							</p>
						)}
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
