import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateMPTokensPayload {
  venue_id?: string;
  venue_slug?: string;
  mp_public_key: string;
  mp_access_token: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: UpdateMPTokensPayload = await req.json();
    console.log('Received payload:', { 
      venue_id: payload.venue_id, 
      venue_slug: payload.venue_slug,
      has_public_key: !!payload.mp_public_key,
      has_access_token: !!payload.mp_access_token
    });

    // Validate required fields
    if (!payload.mp_public_key || !payload.mp_access_token) {
      console.error('Missing required MP tokens');
      return new Response(
        JSON.stringify({ error: 'mp_public_key y mp_access_token son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Need either venue_id or venue_slug
    if (!payload.venue_id && !payload.venue_slug) {
      console.error('Missing venue identifier');
      return new Response(
        JSON.stringify({ error: 'Se requiere venue_id o venue_slug' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the query
    let query = supabase
      .from('venues')
      .update({
        mp_public_key: payload.mp_public_key,
        mp_access_token: payload.mp_access_token
      });

    if (payload.venue_id) {
      query = query.eq('id', payload.venue_id);
    } else if (payload.venue_slug) {
      query = query.eq('slug', payload.venue_slug);
    }

    const { data, error } = await query.select('id, name, slug').single();

    if (error) {
      console.error('Error updating venue:', error);
      return new Response(
        JSON.stringify({ error: 'Error al actualizar tokens de Mercado Pago', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      console.error('Venue not found');
      return new Response(
        JSON.stringify({ error: 'Venue no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated MP tokens for venue:', data.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Tokens de Mercado Pago actualizados correctamente',
        venue: data
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Error inesperado', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
