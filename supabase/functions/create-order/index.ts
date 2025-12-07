import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  cantidad: number
  item: string
  descripcion: string
}

interface OrderPayload {
  venue: string // venue slug
  items: OrderItem[]
  comentarios_generales?: string
  lugar_entrega: string
  total: number
  telefono?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: OrderPayload = await req.json()

    console.log('Received order payload:', JSON.stringify(payload))

    // Validate venue
    if (!payload.venue) {
      return new Response(
        JSON.stringify({ error: 'venue is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate payload
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Items array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!payload.lugar_entrega) {
      return new Response(
        JSON.stringify({ error: 'lugar_entrega is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (typeof payload.total !== 'number' || payload.total < 0) {
      return new Response(
        JSON.stringify({ error: 'total must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get venue by slug
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('id, name, enabled')
      .eq('slug', payload.venue)
      .eq('enabled', true)
      .maybeSingle()

    if (venueError) {
      console.error('Error fetching venue:', venueError)
      return new Response(
        JSON.stringify({ error: 'Failed to validate venue' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!venue) {
      console.log(`Venue not found or disabled: ${payload.venue}`)
      return new Response(
        JSON.stringify({ error: 'Venue not found or disabled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating order for venue: ${venue.name} (${venue.id})`)

    const { data, error } = await supabase
      .from('orders')
      .insert({
        venue_id: venue.id,
        items: payload.items,
        comentarios_generales: payload.comentarios_generales || null,
        lugar_entrega: payload.lugar_entrega,
        total: payload.total,
        telefono: payload.telefono || null,
        status: 'entrante'
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to create order', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Order created successfully for ${venue.name}: ${data.id}`)

    return new Response(
      JSON.stringify({ success: true, order: data }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
