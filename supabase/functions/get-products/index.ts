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

    // Get venue slug from query params
    const url = new URL(req.url);
    const venueSlug = url.searchParams.get('venue');

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

    console.log(`Fetching products for venue: ${venueSlug}`);

    // First get the venue by slug
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, enabled')
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

    console.log(`Found venue: ${venue.name} (${venue.id})`);

    // Fetch products for this venue
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, description, price, category, enabled, quantity')
      .eq('venue_id', venue.id)
      .order('category')
      .order('id');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    console.log(`Successfully fetched ${products?.length || 0} products for ${venue.name}`);

    return new Response(
      JSON.stringify({ 
        venue: { id: venue.id, name: venue.name },
        products 
      }),
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
