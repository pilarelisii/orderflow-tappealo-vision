import { useState, useEffect, useCallback } from 'react';
import { connectQZ, disconnectQZ, isQZConnected, getPrinters, printRaw, openCashDrawer } from '@/lib/qzTray';
import { generateReceiptCommands, generateTestReceipt } from '@/lib/escpos';
import { Order } from '@/types/order';
import { useToast } from '@/hooks/use-toast';

const PRINTER_STORAGE_KEY = 'tappealo_selected_printer';
const AUTO_PRINT_KEY = 'tappealo_auto_print';
const OPEN_DRAWER_KEY = 'tappealo_open_drawer';

export function useQZPrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(() => {
    return localStorage.getItem(PRINTER_STORAGE_KEY);
  });
  const [autoPrint, setAutoPrint] = useState<boolean>(() => {
    return localStorage.getItem(AUTO_PRINT_KEY) === 'true';
  });
  const [openDrawerOnPrint, setOpenDrawerOnPrint] = useState<boolean>(() => {
    return localStorage.getItem(OPEN_DRAWER_KEY) === 'true';
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    try {
      await connectQZ();
      setIsConnected(true);
      const availablePrinters = await getPrinters();
      setPrinters(availablePrinters);
      
      // Restore selected printer if it's still available
      const savedPrinter = localStorage.getItem(PRINTER_STORAGE_KEY);
      if (savedPrinter && availablePrinters.includes(savedPrinter)) {
        setSelectedPrinter(savedPrinter);
      }
    } catch (error: any) {
      console.error('QZ Tray connection error:', error);
      setIsConnected(false);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, isConnected]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectQZ();
      setIsConnected(false);
      setPrinters([]);
    } catch (error) {
      console.error('QZ Tray disconnect error:', error);
    }
  }, []);

  const selectPrinter = useCallback((printerName: string) => {
    setSelectedPrinter(printerName);
    localStorage.setItem(PRINTER_STORAGE_KEY, printerName);
  }, []);

  const toggleAutoPrint = useCallback((enabled: boolean) => {
    setAutoPrint(enabled);
    localStorage.setItem(AUTO_PRINT_KEY, enabled.toString());
  }, []);

  const toggleOpenDrawer = useCallback((enabled: boolean) => {
    setOpenDrawerOnPrint(enabled);
    localStorage.setItem(OPEN_DRAWER_KEY, enabled.toString());
  }, []);

  const printOrder = useCallback(async (order: Order, venueName: string): Promise<boolean> => {
    if (!selectedPrinter) {
      toast({
        title: "Sin impresora",
        description: "Configura una impresora en Ajustes > Impresora",
        variant: "destructive"
      });
      return false;
    }

    if (!isConnected) {
      try {
        await connect();
      } catch (error) {
        toast({
          title: "QZ Tray no disponible",
          description: "Usando impresión del navegador como alternativa",
        });
        return false;
      }
    }

    setIsPrinting(true);
    try {
      const commands = generateReceiptCommands(order, venueName);
      await printRaw(selectedPrinter, commands);
      
      if (openDrawerOnPrint) {
        await openCashDrawer(selectedPrinter);
      }
      
      return true;
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: "Error de impresión",
        description: error.message || "No se pudo imprimir",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [selectedPrinter, isConnected, connect, openDrawerOnPrint, toast]);

  const printTest = useCallback(async (venueName: string): Promise<boolean> => {
    if (!selectedPrinter) {
      toast({
        title: "Sin impresora",
        description: "Selecciona una impresora primero",
        variant: "destructive"
      });
      return false;
    }

    setIsPrinting(true);
    try {
      const commands = generateTestReceipt(venueName);
      await printRaw(selectedPrinter, commands);
      toast({
        title: "Impresión de prueba",
        description: "Ticket enviado correctamente"
      });
      return true;
    } catch (error: any) {
      console.error('Test print error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo imprimir",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [selectedPrinter, toast]);

  const refreshPrinters = useCallback(async () => {
    if (!isConnected) return;
    try {
      const availablePrinters = await getPrinters();
      setPrinters(availablePrinters);
    } catch (error) {
      console.error('Error refreshing printers:', error);
    }
  }, [isConnected]);

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = () => {
      const connected = isQZConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return {
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
    printOrder,
    printTest,
    refreshPrinters
  };
}
