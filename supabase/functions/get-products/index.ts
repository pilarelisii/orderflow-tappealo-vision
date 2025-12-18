import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get venue slug and qr code from query params
    const url = new URL(req.url);
    const venueSlug = url.searchParams.get('venue');
    const qrCode = url.searchParams.get('qr'); // utm_campaign value

    if (!venueSlug) {
      console.log('Missing venue parameter');
      return new Response(
        JSON.stringify({ error: 'venue parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching products for venue: ${venueSlug}, qr: ${qrCode || 'none'}`);

    // First get the venue by slug with all commerce info
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, enabled, service_active, logo_url, google_maps_url, phone')
      .eq('slug', venueSlug)
      .eq('enabled', true)
      .maybeSingle();

    if (venueError) {
      console.error('Error fetching venue:', venueError);
      throw venueError;
    }

    if (!venue) {
      console.log(`Venue not found or disabled: ${venueSlug}`);
      return new Response(
        JSON.stringify({ error: 'Venue not found or disabled' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if service is active
    if (!venue.service_active) {
      console.log(`Service disabled for venue: ${venue.name}`);
      return new Response(
        JSON.stringify({ 
          venue: { 
            id: venue.id, 
            name: venue.name,
            logo_url: venue.logo_url,
            google_maps_url: venue.google_maps_url,
            phone: venue.phone
          },
          service: 'disabled',
          message: 'El local está cerrado, no se pueden realizar pedidos',
          products: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found venue: ${venue.name} (${venue.id})`);

    // If QR code provided, look up delivery_type from qr_locations
    let deliveryType: string | null = null;
    let qrLocation: { name: string | null; delivery_type: string } | null = null;
    
    if (qrCode) {
      const { data: qrData, error: qrError } = await supabase
        .from('qr_locations')
        .select('name, delivery_type, enabled')
        .eq('venue_id', venue.id)
        .eq('code', qrCode)
        .maybeSingle();

      if (qrError) {
        console.error('Error fetching QR location:', qrError);
        // Don't fail the request, just log the error
      } else if (qrData) {
        if (qrData.enabled) {
          deliveryType = qrData.delivery_type;
          qrLocation = { name: qrData.name, delivery_type: qrData.delivery_type };
          console.log(`Found QR location: ${qrCode} -> delivery_type: ${deliveryType}`);
        } else {
          console.log(`QR location disabled: ${qrCode}`);
        }
      } else {
        console.log(`QR code not found: ${qrCode}`);
      }
    }

    // Fetch products for this venue
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, price, category, enabled, quantity, image_url')
      .eq('venue_id', venue.id)
      .order('category')
      .order('id');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`Successfully fetched ${products?.length || 0} products for ${venue.name}`);

    // Build response with optional QR info and venue commerce info
    const response: Record<string, unknown> = { 
      venue: { 
        id: venue.id, 
        name: venue.name,
        logo_url: venue.logo_url,
        google_maps_url: venue.google_maps_url,
        phone: venue.phone
      },
      service: 'enabled',
      products 
    };

    // Add QR location info if available
    if (qrLocation) {
      response.qr_location = qrLocation;
      response.delivery_type = deliveryType;
    }

    return new Response(
      JSON.stringify(response),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in get-products function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
