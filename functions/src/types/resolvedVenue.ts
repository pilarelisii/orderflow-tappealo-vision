export interface ResolvedVenue {
  id: string;
  slug: string | null;
  name: string | null;
  enabled: boolean;
  service_active: boolean; // ✅ agregado
}