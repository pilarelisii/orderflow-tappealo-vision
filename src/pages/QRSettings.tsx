import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, QrCode, Plus, Copy, Check, Trash2, Download, Pencil } from "lucide-react";
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

interface QRLocation {
  id: string;
  venue_id: string;
  code: string;
  name: string | null;
  description: string | null;
  delivery_type: string;
  enabled: boolean;
}

// Generate a URL-safe utm_campaign code from a name
const generateUtmCampaign = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '') // Trim underscores
    .substring(0, 50); // Limit length
};

const DELIVERY_TYPE_OPTIONS = [
  { value: "en_lugar", label: "En el lugar" },
  { value: "retiro", label: "Retiro" },
  { value: "envio", label: "Envío" },
  { value: "retiro_envio", label: "Retiro/Envío" },
];

const QRSettings = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, venue } = useAuth();
  const [serviceActive, setServiceActive] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrLocations, setQrLocations] = useState<QRLocation[]>([]);
  const [loadingQRs, setLoadingQRs] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newQRName, setNewQRName] = useState("");
  const [newQRDescription, setNewQRDescription] = useState("");
  const [newQRDeliveryType, setNewQRDeliveryType] = useState("en_lugar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingQR, setAddingQR] = useState(false);
  const [editingQR, setEditingQR] = useState<QRLocation | null>(null);
  const [editQRName, setEditQRName] = useState("");
  const [editQRDescription, setEditQRDescription] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [menuBaseUrl, setMenuBaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`menu_base_url_${venue?.id}`) || '';
    }
    return '';
  });
  

  // Load menuBaseUrl when venue changes
  useEffect(() => {
    if (venue?.id) {
      const savedUrl = localStorage.getItem(`menu_base_url_${venue.id}`);
      if (savedUrl) {
        setMenuBaseUrl(savedUrl);
      }
    }
  }, [venue?.id]);

  const handleMenuBaseUrlChange = (url: string) => {
    setMenuBaseUrl(url);
    if (venue?.id) {
      localStorage.setItem(`menu_base_url_${venue.id}`, url);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const fetchVenueData = async () => {
      if (!venue?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('venues')
          .select('service_active')
          .eq('id', venue.id)
          .single();

        if (error) throw error;
        setServiceActive(data.service_active);
      } catch (error) {
        console.error('Error fetching venue data:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    if (venue?.id) {
      fetchVenueData();
    }
  }, [venue?.id]);

  useEffect(() => {
    const fetchQRLocations = async () => {
      if (!venue?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('qr_locations')
          .select('*')
          .eq('venue_id', venue.id)
          .order('code');

        if (error) throw error;
        setQrLocations(data || []);
      } catch (error) {
        console.error('Error fetching QR locations:', error);
        toast.error('Error al cargar los QRs');
      } finally {
        setLoadingQRs(false);
      }
    };

    if (venue?.id) {
      fetchQRLocations();
    }
  }, [venue?.id]);

  const handleToggleService = async (checked: boolean) => {
    if (!venue?.id) return;
    
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('venues')
        .update({ service_active: checked })
        .eq('id', venue.id);

      if (error) throw error;

      setServiceActive(checked);
      toast.success(checked ? 'Servicio activado' : 'Servicio desactivado');
    } catch (error) {
      console.error('Error updating service status:', error);
      toast.error('Error al actualizar el estado del servicio');
    } finally {
      setUpdating(false);
    }
  };


  const buildQRUrl = (code: string) => {
    if (!menuBaseUrl) return '';
    const separator = menuBaseUrl.includes('?') ? '&' : '?';
    return `${menuBaseUrl}${separator}utm_source=qr&utm_campaign=${code}`;
  };

  const copyToClipboard = async (code: string, id: string) => {
    const url = buildQRUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success('URL copiada');
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast.error('Error al copiar');
    }
  };

  const handleDeliveryTypeChange = async (qrId: string, newType: string) => {
    try {
      const { error } = await supabase
        .from('qr_locations')
        .update({ delivery_type: newType })
        .eq('id', qrId);

      if (error) throw error;

      setQrLocations(prev => 
        prev.map(qr => qr.id === qrId ? { ...qr, delivery_type: newType } : qr)
      );
      toast.success('Tipo actualizado');
    } catch (error) {
      console.error('Error updating delivery type:', error);
      toast.error('Error al actualizar');
    }
  };

  const handleAddQR = async () => {
    if (!venue?.id || !newQRName.trim()) return;
    
    const utmCampaign = generateUtmCampaign(newQRName.trim());
    
    setAddingQR(true);
    try {
      const { data, error } = await supabase
        .from('qr_locations')
        .insert({
          venue_id: venue.id,
          code: utmCampaign,
          name: newQRName.trim(),
          description: newQRDescription.trim() || null,
          delivery_type: newQRDeliveryType,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe un QR con ese nombre');
        } else {
          throw error;
        }
        return;
      }

      setQrLocations(prev => [...prev, data].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code)));
      setNewQRName("");
      setNewQRDescription("");
      setNewQRDeliveryType("en_lugar");
      setDialogOpen(false);
      toast.success('QR agregado');
    } catch (error) {
      console.error('Error adding QR:', error);
      toast.error('Error al agregar QR');
    } finally {
      setAddingQR(false);
    }
  };

  const handleDeleteQR = async (qrId: string) => {
    try {
      const { error } = await supabase
        .from('qr_locations')
        .delete()
        .eq('id', qrId);

      if (error) throw error;

      setQrLocations(prev => prev.filter(qr => qr.id !== qrId));
      toast.success('QR eliminado');
    } catch (error) {
      console.error('Error deleting QR:', error);
      toast.error('Error al eliminar');
    }
  };

  const downloadQRCode = async (code: string) => {
    const url = buildQRUrl(code);
    try {
      const dataUrl = await QRCodeLib.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      
      const link = document.createElement('a');
      link.download = `qr-${code}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('QR descargado');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Error al generar QR');
    }
  };

  const openEditDialog = (qr: QRLocation) => {
    setEditingQR(qr);
    setEditQRName(qr.name || '');
    setEditQRDescription(qr.description || '');
    setEditDialogOpen(true);
  };

  const handleEditQR = async () => {
    if (!editingQR || !editQRName.trim()) return;
    
    const newUtmCampaign = generateUtmCampaign(editQRName.trim());
    
    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('qr_locations')
        .update({ 
          name: editQRName.trim(),
          description: editQRDescription.trim() || null,
          code: newUtmCampaign,
        })
        .eq('id', editingQR.id);

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe un QR con ese nombre');
        } else {
          throw error;
        }
        return;
      }

      setQrLocations(prev => 
        prev.map(qr => qr.id === editingQR.id ? { 
          ...qr, 
          name: editQRName.trim(),
          description: editQRDescription.trim() || null,
          code: newUtmCampaign,
        } : qr)
          .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code))
      );
      setEditDialogOpen(false);
      setEditingQR(null);
      toast.success('QR actualizado');
    } catch (error) {
      console.error('Error updating QR:', error);
      toast.error('Error al actualizar QR');
    } finally {
      setSavingEdit(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Content */}
      <main className="px-6 py-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <QrCode className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">QRs</h1>
            <p className="text-muted-foreground">Gestiona tu servicio y códigos QR</p>
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
              disabled={updating}
            />
          </div>

          {!serviceActive && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                ⚠️ El local está cerrado
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Los clientes que escaneen el QR verán que el servicio no está disponible y no podrán realizar pedidos.
              </p>
            </div>
          )}
        </div>

        {/* Menu Base URL */}
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
                Ejemplo de URL generada: {buildQRUrl('mesa1')}
              </p>
            )}
          </div>
        </div>

        {/* QR Locations Table */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
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
                    <Label htmlFor="qr-name">Nombre</Label>
                    <Input
                      id="qr-name"
                      placeholder="ej: Mesa 1, Clínica Principal, Natatorio"
                      value={newQRName}
                      onChange={(e) => setNewQRName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este nombre identificará el QR en las comandas
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qr-description">Descripción (opcional)</Label>
                    <Input
                      id="qr-description"
                      placeholder="ej: Mesa cerca de la ventana"
                      value={newQRDescription}
                      onChange={(e) => setNewQRDescription(e.target.value)}
                    />
                  </div>
                  {newQRName.trim() && (
                    <p className="text-xs text-muted-foreground">
                      utm_campaign: <code className="bg-muted px-1 rounded">{generateUtmCampaign(newQRName)}</code>
                    </p>
                  )}
                  <div className="space-y-2">
                    <Label>Tipo de entrega</Label>
                    <Select value={newQRDeliveryType} onValueChange={setNewQRDeliveryType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DELIVERY_TYPE_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                    {addingQR ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Agregar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit QR Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar código QR</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-qr-name">Nombre</Label>
                    <Input
                      id="edit-qr-name"
                      placeholder="ej: Mesa 1, Clínica Principal, Natatorio"
                      value={editQRName}
                      onChange={(e) => setEditQRName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-qr-description">Descripción (opcional)</Label>
                    <Input
                      id="edit-qr-description"
                      placeholder="ej: Mesa cerca de la ventana"
                      value={editQRDescription}
                      onChange={(e) => setEditQRDescription(e.target.value)}
                    />
                  </div>
                  {editQRName.trim() && (
                    <p className="text-xs text-muted-foreground">
                      utm_campaign: <code className="bg-muted px-1 rounded">{generateUtmCampaign(editQRName)}</code>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Nueva URL: {buildQRUrl(generateUtmCampaign(editQRName))}
                  </p>
                  <Button 
                    onClick={handleEditQR} 
                    disabled={!editQRName.trim() || savingEdit}
                    className="w-full"
                  >
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
                    <TableHead className="w-[150px]">Nombre</TableHead>
                    <TableHead className="w-[120px]">utm_campaign</TableHead>
                    <TableHead className="w-[180px]">Tipo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qrLocations.map((qr) => (
                    <TableRow key={qr.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{qr.name || qr.code}</span>
                          {qr.description && (
                            <p className="text-xs text-muted-foreground">{qr.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{qr.code}</code>
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
                            {DELIVERY_TYPE_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => copyToClipboard(qr.code, qr.id)}
                          title="Copiar URL"
                        >
                          {copiedId === qr.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
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
