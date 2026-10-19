export type CouponDiscountType = "percentage" | "fixed";

export interface Coupon {
  id: string;
  venue_id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  enabled: boolean;
  expires_at: string | null;
  min_order: number | null;
  max_uses: number | null;
  uses: number;
  created_at: string;
  updated_at: string;
}

export interface CouponPayload {
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  enabled: boolean;
  expires_at: Date | null;
  min_order: number | null;
  max_uses: number | null;
}
