import { apiFetch } from "./http";

export interface Venue {
  id: string;
  name: string;
  slug: string;
  service_active: boolean;
  google_maps_url?: string | null;
  phone?: string | null;
}

export async function getVenue(venueId: string): Promise<Venue> {
  return apiFetch(`/venues/${venueId}`);
}

export async function updateVenue(
  venueId: string,
  data: Partial<Venue>
): Promise<void> {
  await apiFetch(`/venues/${venueId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}