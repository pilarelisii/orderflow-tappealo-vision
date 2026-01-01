import { Timestamp } from "firebase/firestore";

export interface PromotionItem {
  product_id: string;
  quantity: number;
}

export interface Promotion {
  id: string;
  name: string | null;
  image_url: string | null;
  price: number;
  discount: number;
  start_date: Timestamp;
  end_date: Timestamp;
  created_at: string;
  updated_at: string;
  enabled: boolean;
  items: PromotionItem[];
  venue_id: string;
}