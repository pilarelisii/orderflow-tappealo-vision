export type VenuePlan = "demo" | "trial" | "pro" | "premium" | "basico";

export interface Venue {
  id: string;
  name: string;
  slug: string;
  auth_id: string | null;
  logo_url: string | null;
  plan: VenuePlan;
  enabled: boolean;
  service_active: boolean;
  updated_at: string;
  location_link: string | null;
  phone: string | null;
  adress_1: string | null;
  adress_2: string | null;
  social_link: string | null;
  created_at: string;
}
