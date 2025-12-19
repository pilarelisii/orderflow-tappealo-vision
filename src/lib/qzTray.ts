// QZ Tray integration for thermal printer support
// Documentation: https://qz.io/wiki/

declare global {
  interface Window {
    qz: any;
  }
}

let qzLoaded = false;
let qzConnected = false;

export const loadQZTray = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (qzLoaded && window.qz) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.min.js';
    script.async = true;
    
    script.onload = () => {
      qzLoaded = true;
      // Disable certificate warnings for local development
      if (window.qz) {
        window.qz.security.setCertificatePromise(() => {
          return Promise.resolve();
        });
        window.qz.security.setSignaturePromise(() => {
          return () => Promise.resolve();
        });
      }
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load QZ Tray library'));
    };
    
    document.head.appendChild(script);
  });
};

export const connectQZ = async (): Promise<void> => {
  await loadQZTray();
  
  if (!window.qz) {
    throw new Error('QZ Tray library not loaded');
  }
  
  if (qzConnected && window.qz.websocket.isActive()) {
    return;
  }
  
  try {
    await window.qz.websocket.connect();
    qzConnected = true;
    console.log('QZ Tray connected');
  } catch (error: any) {
    if (error.message?.includes('Unable to establish')) {
      throw new Error('QZ Tray no está instalado o no está ejecutándose. Descárgalo de https://qz.io/download/');
    }
    throw error;
  }
};

export const disconnectQZ = async (): Promise<void> => {
  if (window.qz && window.qz.websocket.isActive()) {
    await window.qz.websocket.disconnect();
    qzConnected = false;
    console.log('QZ Tray disconnected');
  }
};

export const isQZConnected = (): boolean => {
  return qzConnected && window.qz?.websocket?.isActive?.() === true;
};

export const getPrinters = async (): Promise<string[]> => {
  if (!isQZConnected()) {
    await connectQZ();
  }
  
  const printers = await window.qz.printers.find();
  return printers;
};

export const printRaw = async (printerName: string, data: string[]): Promise<void> => {
  if (!isQZConnected()) {
    await connectQZ();
  }
  
  const config = window.qz.configs.create(printerName, {
    encoding: 'UTF-8'
  });
  
  await window.qz.print(config, data);
};

export const openCashDrawer = async (printerName: string): Promise<void> => {
  // ESC/POS command to open cash drawer
  const openDrawerCmd = '\x1B\x70\x00\x19\x19';
  await printRaw(printerName, [openDrawerCmd]);
};
