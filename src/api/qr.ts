import { apiFetch } from "./http";

export interface QRLocation {
  id: string;
  venue_id: string;
  code: string;
  delivery_type: string;
  enabled: boolean;
}

export async function getQRs(venueId: string): Promise<QRLocation[]> {
  return apiFetch(`/venues/${venueId}/qrs`);
}

export async function createQR(data: {
  venueId: string;
  code: string;
  delivery_type: string;
  enabled: boolean;
}): Promise<QRLocation> {
  return apiFetch(`/venues/${data.venueId}/qrs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateQR(
  qrId: string,
  data: Partial<QRLocation>
): Promise<void> {
  await apiFetch(`/qrs/${qrId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteQR(qrId: string): Promise<void> {
  await apiFetch(`/qrs/${qrId}`, {
    method: "DELETE",
  });
}