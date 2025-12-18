import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

/* =======================
   TYPES
   ======================= */
interface QRLocation {
  id: string;
  venue_id: string;
  code: string;
  delivery_type: string;
  enabled: boolean;
}

const DELIVERY_TYPE_OPTIONS = [
  { value: "en_lugar", label: "En el lugar" },
  { value: "retiro", label: "Retiro" },
  { value: "envio", label: "Envío" },
  { value: "retiro_envio", label: "Retiro / Envío" },
];

const FullScreenLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const QRSettings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue } = useAuth();

  const [loadingVenue, setLoadingVenue] = useState(true);
  const [serviceActive, setServiceActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [qrLocations, setQrLocations] = useState<QRLocation[]>([]);
  const [loadingQRs, setLoadingQRs] = useState(true);

  const [newQRCode, setNewQRCode] = useState("");
  const [newQRDeliveryType, setNewQRDeliveryType] = useState("en_lugar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingQR, setAddingQR] = useState(false);

  const [editingQR, setEditingQR] = useState<QRLocation | null>(null);
  const [editQRCode, setEditQRCode] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [menuBaseUrl, setMenuBaseUrl] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [venuePhone, setVenuePhone] = useState("");
  const [savingCommerce, setSavingCommerce] = useState(false);

  /* =======================
     AUTH GUARD
     ======================= */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  /* =======================
     MENU BASE URL (localStorage)
     ======================= */
  useEffect(() => {
    if (!venue?.id) return;
    const saved = localStorage.getItem(`menu_base_url_${venue.id}`) || "";
    setMenuBaseUrl(saved);
  }, [venue?.id]);

  const handleMenuBaseUrlChange = (url: string) => {
    setMenuBaseUrl(url);
    if (venue?.id) localStorage.setItem(`menu_base_url_${venue.id}`, url);
  };

  /* =======================
     LOAD VENUE (doc direct)
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
        setGoogleMapsUrl(data.google_maps_url || "");
        setVenuePhone(data.phone || "");
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
     LOAD QRS
     ======================= */
  useEffect(() => {
    if (!venue?.id) return;

    const loadQRs = async () => {
      setLoadingQRs(true);
      try {
        const qs = await getDocs(
          query(collection(db, "qr_locations"), where("venue_id", "==", venue.id))
        );

        const data = qs.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((x) => x.code) // por si hay docs rotos
          .sort((a, b) => String(a.code).localeCompare(String(b.code)));

        setQrLocations(data);
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar QRs");
      } finally {
        setLoadingQRs(false);
      }
    };

    loadQRs();
  }, [venue?.id]);

  /* =======================
     HANDLERS
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

  const handleSaveCommerce = async () => {
    if (!venue?.id) return;

    setSavingCommerce(true);
    try {
      await updateDoc(doc(db, "venues", venue.id), {
        google_maps_url: googleMapsUrl || null,
        phone: venuePhone || null,
        updated_at: serverTimestamp(),
      });
      toast.success("Datos del comercio actualizados");
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar datos");
    } finally {
      setSavingCommerce(false);
    }
  };

  const handleAddQR = async () => {
    if (!venue?.id || !newQRCode.trim()) return;

    setAddingQR(true);
    try {
      const code = newQRCode.trim().toLowerCase();

      // Chequeo duplicado (mismo venue_id + code)
      const existing = await getDocs(
        query(
          collection(db, "qr_locations"),
          where("venue_id", "==", venue.id),
          where("code", "==", code)
        )
      );
      if (!existing.empty) {
        toast.error("Ya existe un QR con ese código");
        return;
      }

      const ref = await addDoc(collection(db, "qr_locations"), {
        venue_id: venue.id,
        code,
        delivery_type: newQRDeliveryType,
        enabled: true,
        created_at: serverTimestamp(),
      });

      setQrLocations((prev) =>
        [...prev, { id: ref.id, venue_id: venue.id, code, delivery_type: newQRDeliveryType, enabled: true }]
          .sort((a, b) => a.code.localeCompare(b.code))
      );

      setDialogOpen(false);
      setNewQRCode("");
      setNewQRDeliveryType("en_lugar");
      toast.success("QR agregado");
    } catch (e) {
      console.error(e);
      toast.error("Error al agregar QR");
    } finally {
      setAddingQR(false);
    }
  };

  const handleDeliveryTypeChange = async (qrId: string, value: string) => {
    try {
      await updateDoc(doc(db, "qr_locations", qrId), {
        delivery_type: value,
        updated_at: serverTimestamp(),
      });

      setQrLocations((prev) =>
        prev.map((q) => (q.id === qrId ? { ...q, delivery_type: value } : q))
      );

      toast.success("Tipo actualizado");
    } catch (e) {
      console.error(e);
      toast.error("Error al actualizar tipo");
    }
  };

  const handleDeleteQR = async (qrId: string) => {
    if (!venue?.id) return;

    try {
      // Validación simple (evita borrar de otro venue por bug)
      const ref = doc(db, "qr_locations", qrId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        toast.error("QR no encontrado");
        return;
      }
      const data = snap.data() as any;
      if (data.venue_id !== venue.id) {
        toast.error("No tenés permiso para eliminar este QR");
        return;
      }

      await deleteDoc(ref);
      setQrLocations((prev) => prev.filter((q) => q.id !== qrId));
      toast.success("QR eliminado");
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar QR");
    }
  };

  const openEditDialog = (qr: QRLocation) => {
    setEditingQR(qr);
    setEditQRCode(qr.code);
    setEditDialogOpen(true);
  };

  const handleEditQR = async () => {
    if (!venue?.id || !editingQR) return;

    setSavingEdit(true);
    try {
      const newCode = editQRCode.trim().toLowerCase();
      if (!newCode) {
        toast.error("Código inválido");
        return;
      }

      // Chequeo duplicado si cambió
      if (newCode !== editingQR.code) {
        const existing = await getDocs(
          query(
            collection(db, "qr_locations"),
            where("venue_id", "==", venue.id),
            where("code", "==", newCode)
          )
        );
        if (!existing.empty) {
          toast.error("Ya existe un QR con ese código");
          return;
        }
      }

      await updateDoc(doc(db, "qr_locations", editingQR.id), {
        code: newCode,
        updated_at: serverTimestamp(),
      });

      setQrLocations((prev) =>
        prev
          .map((q) => (q.id === editingQR.id ? { ...q, code: newCode } : q))
          .sort((a, b) => a.code.localeCompare(b.code))
      );

      setEditDialogOpen(false);
      setEditingQR(null);
      toast.success("QR actualizado");
    } catch (e) {
      console.error(e);
      toast.error("Error al editar QR");
    } finally {
      setSavingEdit(false);
    }
  };

  const buildQRUrl = (code: string) => {
    if (!menuBaseUrl) return "";
    const sep = menuBaseUrl.includes("?") ? "&" : "?";
    return `${menuBaseUrl}${sep}utm_source=qr&utm_campaign=${code}`;
  };

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(buildQRUrl(code));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("URL copiada");
    } catch (e) {
      console.error(e);
      toast.error("Error al copiar");
    }
  };

  const downloadQRCode = async (code: string) => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(buildQRUrl(code), {
        width: 512,
        margin: 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr-${code}.png`;
      a.click();
      toast.success("QR descargado");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar QR");
    }
  };

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
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <img src={tappealoLogo} alt="Tappealo" className="h-10" />
        </div>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Store className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
            <p className="text-muted-foreground">Gestiona tu comercio, servicio y códigos QR</p>
          </div>
        </div>

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
              disabled={updating}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="menu-url" className="text-base font-medium">
                URL Base del Menú
              </Label>
              <p className="text-sm text-muted-foreground">
                Ingresa la URL base de tu menú. Los parámetros utm_source y utm_campaign se agregarán automáticamente.
              </p>
            </div>
            <Input
              id="menu-url"
              placeholder="https://tudominio.com/menu"
              value={menuBaseUrl}
              onChange={(e) => handleMenuBaseUrlChange(e.target.value)}
              className="max-w-xl"
            />
            {menuBaseUrl && (
              <p className="text-xs text-muted-foreground">
                Ejemplo de URL generada: {buildQRUrl("mesa1")}
              </p>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Store className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Comercio</h2>
              <p className="text-sm text-muted-foreground">Información del local para mostrar en el menú</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-maps" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Enlace a Google Maps
              </Label>
              <Input
                id="google-maps"
                placeholder="https://maps.google.com/..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="max-w-xl"
              />
            </div>

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

            <Button onClick={handleSaveCommerce} disabled={savingCommerce} size="sm">
              {savingCommerce ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar datos del comercio
            </Button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Códigos QR</h2>
              <p className="text-sm text-muted-foreground">Gestiona los tipos de entrega para cada QR</p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
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
                    <Label htmlFor="qr-code">Código (utm_campaign)</Label>
                    <Input
                      id="qr-code"
                      placeholder="ej: mesa1"
                      value={newQRCode}
                      onChange={(e) => setNewQRCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de entrega</Label>
                    <Select value={newQRDeliveryType} onValueChange={setNewQRDeliveryType}>
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

                  <Button onClick={handleAddQR} disabled={!newQRCode.trim() || addingQR} className="w-full">
                    {addingQR ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Agregar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar código QR</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-qr-code">Código (utm_campaign)</Label>
                    <Input
                      id="edit-qr-code"
                      value={editQRCode}
                      onChange={(e) => setEditQRCode(e.target.value)}
                    />
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Nueva URL: {buildQRUrl(editQRCode)}
                  </p>

                  <Button onClick={handleEditQR} disabled={!editQRCode.trim() || savingEdit} className="w-full">
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Guardar cambios
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingQRs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : qrLocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <QrCode className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay códigos QR configurados</p>
              <p className="text-sm">Agrega tu primer QR para empezar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">QR Code</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-[180px]">Tipo</TableHead>
                    <TableHead className="w-[50px]" />
                    <TableHead className="w-[50px]" />
                    <TableHead className="w-[50px]" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {qrLocations.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell className="font-medium">{qr.code}</TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {buildQRUrl(qr.code)}
                          </span>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => copyToClipboard(qr.code, qr.id)}
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
                          onValueChange={(value) => handleDeliveryTypeChange(qr.id, value)}
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
                          onClick={() => downloadQRCode(qr.code)}
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
                          title="Editar QR"
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
                          title="Eliminar QR"
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
    </div>
  );
};

export default QRSettings;