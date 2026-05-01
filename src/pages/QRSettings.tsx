import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQrs } from "@/hooks/useQrs";
import { QRLocation, DeliveryType } from "@/types/qrLocation";
import {
	Loader2,
	ArrowLeft,
	QrCode,
	Plus,
	Copy,
	Check,
	Trash2,
	Download,
	Pencil,
	Store,
	MapPin,
	Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import QRCodeLib from "qrcode";
import tappealoLogo from "@/assets/tappealo-logo.png";
import { downloadAllQRCodesPDF } from "@/lib/downloadAllQRCodesPDF";
import { downloadQRCodePosterPDF } from "@/lib/downloadQRCodePosterPDF";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

import { db } from "@/integrations/firebase/client";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { downloadQRCodePDF } from "@/lib/downloadQRCodePDF";
import FullScreenLoader from "@/components/FullScreenLoader";
import { downloadAllQRCodePostersPDF } from "@/lib/downloadAllQRCodesPosterPDF";

const DELIVERY_TYPE_OPTIONS: { value: DeliveryType; label: string }[] = [
	{ value: "en_lugar", label: "En el lugar" },
	{ value: "retiro", label: "Retiro" },
	{ value: "envio", label: "Envío" },
];


const QRSettings = () => {
	const navigate = useNavigate();
	const { isAuthenticated, loading: authLoading, venue } = useAuth();

	// ✅ Venues (direct Firestore)
	const [loadingVenue, setLoadingVenue] = useState(true);
	const [serviceActive, setServiceActive] = useState(true);
	const [updating, setUpdating] = useState(false);
	// ✅ QRs (hook snapshot)
	const { qrs, loading: loadingQRs, createQR, updateQR, deleteQR } = useQrs();

	// UI state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [addingQR, setAddingQR] = useState(false);

	// 👇 antes era newQRCode (code). Ahora es name
	const [newQRName, setNewQRName] = useState("");
	const [newQRDeliveryType, setNewQRDeliveryType] =
		useState<DeliveryType>("en_lugar");

	const [editingQR, setEditingQR] = useState<QRLocation | null>(null);
	const [editQRName, setEditQRName] = useState("");
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [savingEdit, setSavingEdit] = useState(false);

	const [copiedId, setCopiedId] = useState<string | null>(null);

	const [loadingQRCodes, setLoadingQRCodes] = useState(false);
	/* =======================
     AUTH GUARD
     ======================= */
	useEffect(() => {
		if (!authLoading && !isAuthenticated) navigate("/login");
	}, [authLoading, isAuthenticated, navigate]);

	/* =======================
     LOAD VENUE
     ======================= */
	useEffect(() => {
		if (!venue?.id) return;

		const loadVenue = async () => {
			setLoadingVenue(true);
			try {
				const snap = await getDoc(doc(db, "venues", venue.id));
				if (!snap.exists()) throw new Error("Venue no existe en Firestore");

				const data = snap.data() as any;
				setServiceActive(!!data.service_active);
			} catch (e) {
				console.error(e);
				toast.error("Error al cargar datos del comercio");
			} finally {
				setLoadingVenue(false);
			}
		};

		loadVenue();
	}, [venue?.id]);

	/* =======================
     HANDLERS - VENUE
     ======================= */
	const handleToggleService = async (checked: boolean) => {
		if (!venue?.id) return;

		setUpdating(true);
		try {
			await updateDoc(doc(db, "venues", venue.id), {
				service_active: checked,
				updated_at: serverTimestamp(),
			});
			setServiceActive(checked);
			toast.success(checked ? "Servicio activado" : "Servicio desactivado");
		} catch (e) {
			console.error(e);
			toast.error("Error al actualizar servicio");
		} finally {
			setUpdating(false);
		}
	};

	/* =======================
     HANDLERS - QRS (useQrs)
     ======================= */
	const handleAddQR = async () => {
		if (!newQRName.trim()) return;

		setAddingQR(true);
		try {
			await createQR({
				name: newQRName.trim(),
				delivery_type: newQRDeliveryType,
				enabled: true,
			});

			setDialogOpen(false);
			setNewQRName("");
			setNewQRDeliveryType("en_lugar");
			toast.success("QR agregado");
		} catch (e: any) {
			console.error(e);
			toast.error(e?.message || "Error al agregar QR");
		} finally {
			setAddingQR(false);
		}
	};

	const handleDeliveryTypeChange = async (
		qrId: string,
		value: DeliveryType
	) => {
		try {
			await updateQR(qrId, { delivery_type: value });
			toast.success("Tipo actualizado");
		} catch (e: any) {
			console.error(e);
			toast.error(e?.message || "Error al actualizar tipo");
		}
	};

	const handleDeleteQR = async (qrId: string) => {
		try {
			await deleteQR(qrId);
			toast.success("QR eliminado");
		} catch (e: any) {
			console.error(e);
			toast.error(e?.message || "Error al eliminar QR");
		}
	};

	const openEditDialog = (qr: QRLocation) => {
		setEditingQR(qr);
		setEditQRName(qr.name || "");
		setEditDialogOpen(true);
	};

	const handleEditQR = async () => {
		if (!editingQR) return;

		setSavingEdit(true);
		try {
			const name = editQRName.trim();
			if (!name) {
				toast.error("Nombre inválido");
				return;
			}

			await updateQR(editingQR.id, { name });
			setEditDialogOpen(false);
			setEditingQR(null);
			toast.success("QR actualizado");
		} catch (e: any) {
			console.error(e);
			toast.error(e?.message || "Error al editar QR");
		} finally {
			setSavingEdit(false);
		}
	};

	const MENU_DOMAIN = "tappealo.com"; // cambiá por tu dominio real

	const buildQRUrl = (qrId: string) => {
		const slug = (venue?.slug || "").trim().toLowerCase();
		if (!slug) return "";
		return `https://menu.${MENU_DOMAIN}/menu/${slug}/?utm_source=qr&utm_campaign=${qrId}`;
	};

	const copyToClipboard = async (qrId: string) => {
		try {
			await navigator.clipboard.writeText(buildQRUrl(qrId));
			setCopiedId(qrId);
			setTimeout(() => setCopiedId(null), 2000);
			toast.success("URL copiada");
		} catch (e) {
			console.error(e);
			toast.error("Error al copiar");
		}
	};

	const downloadQRCode = async (qrId: string, filename: string) => {
		setLoadingQRCodes(true)
		try {
			const url = buildQRUrl(qrId);

			await downloadQRCodePosterPDF({
				qrUrl: url,
				qrName: filename || qrId,
				venueLogoUrl: venue?.logo_data_url || null,
				filename,
			});

			toast.success("PDF descargado");
		} catch (e) {
			console.error(e);
			toast.error("Error al generar el PDF");
		} finally {
			setLoadingQRCodes(false)
		}
	};

	const downloadAllQRCodes = async () => {
		setLoadingQRCodes(true);
		try {
			if (!qrs.length) {
				toast.error("No hay QRs para descargar");
				return;
			}
			toast.info("Generando PDF... esto puede tardar unos segundos");

			const items = qrs.map((qr) => ({
				qrUrl: buildQRUrl(qr.id),
				qrName: qr.name || qr.id,
			}));

			await downloadAllQRCodePostersPDF({
				items,
				venueLogoUrl: venue?.logo_data_url || null,
				filename: `qrs-${venue?.slug || "comercio"}`,
			});

			toast.success("PDF generado");
		} catch (e) {
			console.error(e);
			toast.error("Error al generar el PDF");
		} finally {
			setLoadingQRCodes(false);
		}
	};

	const qRDisabled = () => {
		if (venue) { 
			if(venue?.plan === "basico" && qrs.length >= 10){ 
				return true;
			} else if(venue?.plan === "pro" && qrs.length >= 20){ 
				return true;
			} else if(venue?.plan === "demo" && qrs.length >= 1){ 
				return true;
			} else {
				return false;
			}
		}
	}

	function fixFirebaseUrl(url: string) {
		if (!url.includes("alt=media")) {
			return url.includes("?") ? `${url}&alt=media` : `${url}?alt=media`;
		}
		return url;
	}

	/* =======================
     RENDER
     ======================= */
	if (authLoading || loadingVenue) return <FullScreenLoader />;
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
					<QrCode className="h-8 w-8 text-primary" />
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							Configuración de QRs
						</h1>
						<p className="text-muted-foreground">
							Gestiona tu servicio y códigos QR
						</p>
					</div>
				</div>

				{/* Service Toggle */}
				<div className="bg-card border border-border rounded-lg p-6 mb-6">
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<Label htmlFor="service-toggle" className="text-base font-medium">
								Servicio Activo
							</Label>
							<p className="text-sm text-muted-foreground">
								{serviceActive
									? "El menú está disponible para recibir pedidos"
									: "El menú está cerrado, no se pueden realizar pedidos"}
							</p>
						</div>
						<Switch
							id="service-toggle"
							checked={serviceActive}
							onCheckedChange={handleToggleService}
							disabled={updating || venue?.plan === "demo"}
						/>
					</div>
				</div>

				{/* QRs */}
				<div className="bg-card border border-border rounded-lg p-6">
					<div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
						<div>
							<h2 className="text-lg font-semibold text-foreground">
								Códigos QR
							</h2>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={downloadAllQRCodes}
								disabled={!qrs.length || loadingQRCodes}
							>
								{loadingQRCodes ? (
									<>Cargando...</>
								) : (
									<>
										<Download className="h-4 w-4 mr-2" />
										Descargar todos
									</>
								)}
							</Button>

							<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
								<DialogTrigger asChild>
									<Button size="sm" disabled={qRDisabled()}>
										<Plus className="h-4 w-4 mr-2" />
										Agregar QR
									</Button>
								</DialogTrigger>

								<DialogContent>
									<DialogHeader>
										<DialogTitle>Agregar nuevo QR</DialogTitle>
									</DialogHeader>

									<div className="space-y-4 pt-4">
										<div className="space-y-2">
											<Label htmlFor="qr-name">Nombre</Label>
											<Input
												id="qr-name"
												placeholder="Ej: Mesa 1 / Caja / Delivery"
												value={newQRName}
												onChange={(e) => setNewQRName(e.target.value)}
											/>
										</div>

										<div className="space-y-2">
											<Label>Tipo de entrega</Label>
											<Select
												value={newQRDeliveryType}
												onValueChange={(v) =>
													setNewQRDeliveryType(v as DeliveryType)
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{DELIVERY_TYPE_OPTIONS.map((o) => (
														<SelectItem key={o.value} value={o.value}>
															{o.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>

										<Button
											onClick={handleAddQR}
											disabled={!newQRName.trim() || addingQR}
											className="w-full"
										>
											{addingQR ? (
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
											) : null}
											Agregar
										</Button>
									</div>
								</DialogContent>
							</Dialog>
						</div>
					</div>

					{loadingQRs ? (
						<div className="flex justify-center py-8">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : qrs.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
							<p>No hay QRs configurados</p>
							<p className="text-sm">Agregá tu primer QR para empezar</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[220px]">Nombre</TableHead>
										<TableHead>URL</TableHead>
										<TableHead className="w-[180px]">Tipo</TableHead>
										<TableHead className="w-[50px]" />
										<TableHead className="w-[50px]" />
										<TableHead className="w-[50px]" />
									</TableRow>
								</TableHeader>

								<TableBody>
									{qrs.map((qr) => (
										<TableRow key={qr.id}>
											<TableCell className="font-medium">
												{qr.name || "(sin nombre)"}
											</TableCell>

											<TableCell>
												<div className="flex items-center gap-2">
													<span className="text-sm text-muted-foreground truncate max-w-[340px]">
														{buildQRUrl(qr.id)}
													</span>

													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 shrink-0"
														onClick={() => copyToClipboard(qr.id)}
														title="Copiar URL"
													>
														{copiedId === qr.id ? (
															<Check className="h-4 w-4 text-green-600" />
														) : (
															<Copy className="h-4 w-4" />
														)}
													</Button>
												</div>
											</TableCell>

											<TableCell>
												<Select
													value={qr.delivery_type}
													onValueChange={(value) =>
														handleDeliveryTypeChange(
															qr.id,
															value as DeliveryType
														)
													}
												>
													<SelectTrigger className="h-9">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{DELIVERY_TYPE_OPTIONS.map((o) => (
															<SelectItem key={o.value} value={o.value}>
																{o.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>

											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={() =>
														downloadQRCode(qr.id, qr.name || qr.id)
													}
													title="Descargar QR"
												>
													<Download className="h-4 w-4" />
												</Button>
											</TableCell>

											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8"
													onClick={() => openEditDialog(qr)}
													title="Editar"
												>
													<Pencil className="h-4 w-4" />
												</Button>
											</TableCell>

											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 text-destructive hover:text-destructive"
													onClick={() => handleDeleteQR(qr.id)}
													title="Eliminar"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</main>
			<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Editar QR</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 pt-4">
						<div className="space-y-2">
							<Label htmlFor="edit-qr-name">Nombre</Label>
							<Input
								id="edit-qr-name"
								value={editQRName}
								onChange={(e) => setEditQRName(e.target.value)}
								placeholder="Ej: Mesa 1 / Barra / Retiro"
							/>
						</div>

						{editingQR?.id ? (
							<div className="rounded-md bg-muted p-3">
								<a className="text-sm text-muted-foreground break-all underline" href={buildQRUrl(editingQR.id)}>
									{buildQRUrl(editingQR.id)}
								</a>
							</div>
						) : null}

						<div className="flex justify-end gap-2 pt-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setEditDialogOpen(false)}
								disabled={savingEdit}
							>
								Cancelar
							</Button>

							<Button
								type="button"
								onClick={handleEditQR}
								disabled={!editQRName.trim() || savingEdit}
							>
								{savingEdit ? (
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
								) : null}
								Guardar cambios
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default QRSettings;
