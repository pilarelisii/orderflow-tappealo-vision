import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import tappealoLogo from "@/assets/tappealo-logo.png";  
import { Store, ArrowLeft, Phone, MapPin, PenLine, PaintBucket, Baseline, Layers2,LayoutPanelTop, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/integrations/firebase/client";

import FullScreenLoader from "@/components/FullScreenLoader";

export default function MenuEdit() {
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading, venue } = useAuth();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);


    const [venueColorText, setVenueColorText] = useState("#000000");
    const [venueColorBackground, setVenueColorBackground] = useState("#ffffff");
    const [venueForeground, setVenueForeground] = useState("");
    const [venueColorPrimary, setVenueColorPrimary] = useState("#ffffff");

        useEffect(() => {
            const fetchVenueData = async () => {
                if (!venue?.id) return;
                
                setLoading(true);
                try {
                    const snap = await getDoc(doc(db, "venues", venue.id));
                    if (!snap.exists()) throw new Error("Venue no existe en Firestore");
                    
                    const data = snap.data() as any;
                    console.log("Venue data:", data); // Debug: revisar datos del venue
                    setVenueColorText((data.color_text || "").toString());
                    setVenueColorBackground((data.color_background || "").toString());
                    setVenueColorPrimary((data.color_primary || "").toString());
                    setVenueForeground((data.color_foreground || "").toString());

                } catch (error) {
                    console.error("Error fetching venue colors:", error);
                    toast.error("Error al cargar los colores del menu");
                } finally {
                    setLoading(false);
                }
            };
    
            fetchVenueData();
        }, [venue?.id]);
     const handleSave = async () => {
         if (!venue?.id) return;

         setSaving(true);
         try {
             // 3) Guardar venue (una sola vez)
             await updateDoc(doc(db, "venues", venue.id), {
                 color_background: venueColorBackground,
                 color_text: venueColorText,
                 color_foreground: venueForeground,
                 color_primary: venueColorPrimary,
             });
                // 4) Feedback al usuario  
             toast.success("Colores del menu actualizados correctamente");
         } catch (error) {
             console.error("Error updating menu colors:", error);
             toast.error("Error al actualizar los colores del menu");
         } finally {
             setSaving(false);
         }
     };
    if (authLoading || loading) {
            return (
                <FullScreenLoader/>
            );
        }
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
					<PenLine className="h-8 w-8 text-primary" />
					<div>
						<h1 className="text-2xl font-bold text-foreground">Personalizacion del menu</h1>
						<p className="text-muted-foreground">
							Seleccion de colores, diseño y opciones para tu menu digital
                            según la identidad de tu marca.
						</p>
					</div>
				</div>
				
				<div className="bg-card border border-border rounded-lg p-6 mb-8">
					<div className="space-y-4">
						{/* Logo */}
						

						{/* cambio de fondo */}
						<div className="space-y-2">
							<Label htmlFor="venue-name" className="flex items-center gap-2">
								<PaintBucket className="h-4 w-4" />
								Color de fondo
							</Label>
							<Input type="color" onChange={(e) => setVenueColorBackground(e.target.value)} id="venue-name" defaultValue={venueColorBackground} value={venueColorBackground} className="w-16 h-10 p-0 border-0" />
						</div>

						<div className="space-y-2">
							<Label htmlFor="venue-name" className="flex items-center gap-2">
								<Baseline className="h-4 w-4" />
								Color del texto
							</Label>
							<Input type="color" onChange={(e)=>setVenueColorText(e.target.value)} id="venue-name" defaultValue={venueColorText} value={venueColorText} className="w-16 h-10 p-0 border-0" />
						</div>

                        <div className="space-y-2">
							<Label htmlFor="venue-name" className="flex items-center gap-2">
								<Layers2 className="h-4 w-4" />
								Color del contenido
							</Label>
							<Input type="color" onChange={(e) => setVenueForeground(e.target.value)} id="venue-name" defaultValue={venueForeground} value={venueForeground} className="w-16 h-10 p-0 border-0" />
						</div>
                        <div className="space-y-2">
							<Label htmlFor="venue-name" className="flex items-center gap-2">
								<LayoutPanelTop className="h-4 w-4" />
								Color de los botones
							</Label>
							<Input type="color" onChange={(e) => setVenueColorPrimary(e.target.value)} id="venue-name" defaultValue={venueColorPrimary} value={venueColorPrimary} className="w-16 h-10 p-0 border-0" />
						</div>


						
					</div>
				</div>
				
				<div className="mt-6">
					<Button onClick={handleSave} disabled={saving}>
						{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
						Guardar
					</Button>
				</div>
			</main>
		</div>
	);
};

