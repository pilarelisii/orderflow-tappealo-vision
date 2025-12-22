import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
}

interface PaymentPayload {
  venue_slug: string;
  items: PaymentItem[];
  payer_email?: string;
  back_urls?: {
    success?: string;
    failure?: string;
    pending?: string;
  };
  external_reference?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const payload: PaymentPayload = await req.json();

    // Validate required fields
    if (!payload.venue_slug) {
      return new Response(
        JSON.stringify({ error: 'venue_slug is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'items array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating payment preference for venue: ${payload.venue_slug}`);

    // Get venue with mp_access_token (never expose this to frontend!)
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, mp_access_token')
      .eq('slug', payload.venue_slug)
      .eq('enabled', true)
      .maybeSingle();

    if (venueError) {
      console.error('Error fetching venue:', venueError);
      throw venueError;
    }

    if (!venue) {
      console.log(`Venue not found or disabled: ${payload.venue_slug}`);
      return new Response(
        JSON.stringify({ error: 'Venue not found or disabled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!venue.mp_access_token) {
      console.log(`Mercado Pago not configured for venue: ${venue.name}`);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago not configured for this venue' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found venue: ${venue.name}, creating preference with ${payload.items.length} items`);

    // Build preference payload for Mercado Pago API
    const preferencePayload: Record<string, unknown> = {
      items: payload.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: item.currency_id || 'ARS'
      })),
      auto_return: 'approved'
    };

    // Add payer email if provided
    if (payload.payer_email) {
      preferencePayload.payer = { email: payload.payer_email };
    }

    // Add back URLs if provided
    if (payload.back_urls) {
      preferencePayload.back_urls = payload.back_urls;
    }

    // Add external reference if provided (useful for tracking orders)
    if (payload.external_reference) {
      preferencePayload.external_reference = payload.external_reference;
    }

    console.log('Calling Mercado Pago API to create preference...');

    // Call Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${venue.mp_access_token}`
      },
      body: JSON.stringify(preferencePayload)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error(`Mercado Pago API error: ${mpResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment preference', 
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpData = await mpResponse.json();

    console.log(`Payment preference created successfully: ${mpData.id}`);

    // Return only what the frontend needs (never expose access_token!)
    return new Response(
      JSON.stringify({
        preference_id: mpData.id,
        init_point: mpData.init_point,
        sandbox_init_point: mpData.sandbox_init_point
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in create-payment-preference function:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
