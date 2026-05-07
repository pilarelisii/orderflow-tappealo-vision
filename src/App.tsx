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
import AdminRoute from "./components/AdminRoute";
import LoginAdmin from "./pages/LoginAdmin";
import AdminHome from "./pages/AdminHome";
import AdminCreateVenue from "./pages/AdminCreateVenues";
import CommerceHome from "./pages/CommerceHome";
import Manual from "./pages/Manual";
import MenuEdit from "./pages/MenuEdit";


const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<Toaster />
			<Sonner />
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/login-admin" element={<LoginAdmin />} />
					<Route
						path="/admin"
						element={
							<AdminRoute>
								<AdminHome />
							</AdminRoute>
						}
					/>

					<Route
						path="/admin/create"
						element={
							<AdminRoute>
								<AdminCreateVenue />
							</AdminRoute>
						}
					/>
					<Route path="/" element={<Index />} />
					<Route path="/manual" element={<Manual />} />
					<Route path="/panel" element={<CommerceHome />} />
					<Route path="/panel/stock" element={<Stock />} />
					<Route path="/panel/qr-settings" element={<QRSettings />} />
					<Route path="/panel/personalizacion" element={<MenuEdit />} />
					{/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
					<Route
						path="/panel/comercio-settings"
						element={<CommerceSettings />}
					/>
					<Route path="/panel/printer-settings" element={<PrinterSettings />} />
					<Route path="/panel/promotions" element={<Promotions />} />
					<Route path="*" element={<NotFound />} />
				</Routes>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
