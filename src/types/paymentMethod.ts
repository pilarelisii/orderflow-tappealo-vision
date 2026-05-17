export type PaymentType = 'MP' | 'EF' | 'TC' | 'TD' | 'EF_Counter';

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentType,
  enabled: boolean;
  venue_id: string;
}