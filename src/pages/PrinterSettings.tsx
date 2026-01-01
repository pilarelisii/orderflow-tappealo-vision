import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  TestTube,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useQZPrinter } from "@/hooks/useQZPrinter";
import { useAuth } from "@/hooks/useAuth";

import { db } from "@/integrations/firebase/client";
import { doc, getDoc } from "firebase/firestore";

export default function PrinterSettings() {
  const navigate = useNavigate();
  const { venue } = useAuth();

  const [venueName, setVenueName] = useState("Mi Comercio");

  const {
    isConnected,
    isConnecting,
    isPrinting,
    printers,
    selectedPrinter,
    autoPrint,
    openDrawerOnPrint,
    connect,
    disconnect,
    selectPrinter,
    toggleAutoPrint,
    toggleOpenDrawer,
    printTest,
    refreshPrinters,
  } = useQZPrinter();

  useEffect(() => {
    const fetchVenueName = async () => {
      if (!venue?.id) return;

      const snap = await getDoc(doc(db, "venues", venue.id));
      if (snap.exists()) {
        const data = snap.data() as any;
        setVenueName((data.name || "Mi Comercio").toString());
      }
    };

    fetchVenueName();
  }, [venue?.id]);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      // el hook ya maneja toasts/errores
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Configuración de Impresora</h1>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Estado de Conexión
            </CardTitle>
            <CardDescription>
              QZ Tray permite imprimir directamente sin diálogos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">
                      Conectado
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-600 font-medium">
                      Desconectado
                    </span>
                  </>
                )}
              </div>

              {isConnected ? (
                <Button variant="outline" onClick={disconnect}>
                  Desconectar
                </Button>
              ) : (
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? "Conectando..." : "Conectar"}
                </Button>
              )}
            </div>

            {!isConnected && (
              <Alert>
                <Download className="h-4 w-4" />
                <AlertTitle>QZ Tray requerido</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>Para impresión silenciosa necesitas instalar QZ Tray:</p>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>
                      Descarga QZ Tray desde{" "}
                      <a
                        href="https://qz.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        qz.io/download
                      </a>
                    </li>
                    <li>Instálalo y ejecútalo</li>
                    <li>Vuelve aquí y presiona "Conectar"</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Printer Selection */}
        {isConnected && (
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Impresora</CardTitle>
              <CardDescription>
                Elige la impresora térmica para las comandas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={selectedPrinter || ""}
                  onValueChange={selectPrinter}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecciona una impresora" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((printer) => (
                      <SelectItem key={printer} value={printer}>
                        {printer}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshPrinters}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {selectedPrinter && (
                <Button
                  variant="outline"
                  onClick={() => printTest(venueName)}
                  disabled={isPrinting}
                  className="w-full"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isPrinting ? "Imprimiendo..." : "Imprimir Prueba"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Print Options */}
        {isConnected && selectedPrinter && (
          <Card>
            <CardHeader>
              <CardTitle>Opciones de Impresión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-print">Impresión automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Imprimir automáticamente cuando llega un pedido nuevo
                  </p>
                </div>
                <Switch
                  id="auto-print"
                  checked={autoPrint}
                  onCheckedChange={toggleAutoPrint}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="open-drawer">Abrir cajón</Label>
                  <p className="text-sm text-muted-foreground">
                    Abrir el cajón de dinero al imprimir
                  </p>
                </div>
                <Switch
                  id="open-drawer"
                  checked={openDrawerOnPrint}
                  onCheckedChange={toggleOpenDrawer}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help */}
        <Card>
          <CardHeader>
            <CardTitle>Impresoras Compatibles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Compatible con impresoras térmicas de 80mm que soporten ESC/POS:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Epson TM-T20, TM-T88</li>
              <li>Star TSP100, TSP650</li>
              <li>Citizen CT-S310</li>
              <li>Bixolon SRP-350</li>
              <li>Y la mayoría de impresoras térmicas genéricas</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}