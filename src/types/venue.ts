export interface Venue {
  id: string;
  name: string;
  slug: string;
  user_id: string | null;
  logo_url: string | null;
  enabled: boolean;
  created_at: string;
}
