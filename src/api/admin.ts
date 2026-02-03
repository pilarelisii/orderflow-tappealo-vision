import { getFunctions, httpsCallable } from "firebase/functions";

type CreateVenueInput = {
  email: string;
  password: string;
  slug: string;
  name: string;
  phone?: string | null;
  location_link?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  social_link?: string | null;
};

export async function adminCreateVenue(input: CreateVenueInput) {
  const fn = httpsCallable(getFunctions(), "adminCreateVenue");
  const res: any = await fn(input);
  return res.data as { ok: true; venueId: string; authId: string; slug: string };
}