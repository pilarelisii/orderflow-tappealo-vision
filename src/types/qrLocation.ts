export type DeliveryType = 'envio' | 'retiro' | 'en_lugar' | 'retiro_envio';

export interface QRLocation {
  id: string;
  name: string;
  delivery_type: DeliveryType,
  enabled: boolean;
  created_at: string;
  venue_id: string;
}
