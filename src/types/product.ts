
export interface Product {
  id: string;
  category_id: string;
  name: string | null;
  description: string | null;
  quantity: number;
  image_url: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  enabled: boolean;
  venue_id: string;
  featured?: boolean;
}