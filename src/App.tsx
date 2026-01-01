import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Stock from "./pages/Stock";
import QRSettings from "./pages/QRSettings";
import NotFound from "./pages/NotFound";
import CommerceSettings from "./pages/CommerceSettings";
import PrinterSettings from "./pages/PrinterSettings";
import Promotions from "./pages/Promotions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Index />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/qr-settings" element={<QRSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="/comercio-settings" element={<CommerceSettings />} />
          <Route path="/printer-settings" element={<PrinterSettings />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
