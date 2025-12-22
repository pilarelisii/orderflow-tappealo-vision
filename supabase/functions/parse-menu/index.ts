import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectedProduct {
  name: string;
  description: string | null;
  price: number;
  category: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing menu image with OpenAI Vision...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un experto en analizar imágenes de menús de restaurantes y bares. Tu tarea es extraer todos los productos con sus precios y organizarlos por categorías.

INSTRUCCIONES:
1. Identifica TODOS los productos visibles en el menú
2. Extrae el nombre exacto de cada producto
3. Extrae el precio numérico (solo el número, sin símbolos de moneda)
4. Si hay descripción, inclúyela de forma breve (máximo 100 caracteres)
5. Agrupa los productos en categorías lógicas (ENTRADAS, PRINCIPALES, BEBIDAS, POSTRES, etc.)
6. Si el menú tiene categorías definidas, úsalas
7. Si no hay categorías claras, crea categorías apropiadas

RESPONDE ÚNICAMENTE con un JSON válido con el siguiente formato:
{
  "products": [
    {
      "name": "Nombre del producto",
      "description": "Descripción breve o null",
      "price": 1500,
      "category": "CATEGORIA EN MAYUSCULAS"
    }
  ]
}

NO incluyas texto adicional, solo el JSON.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analiza esta imagen de menú y extrae todos los productos con sus precios y categorías:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Error al procesar imagen con OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in OpenAI response');
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer información del menú' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI response:', content);

    // Parse the JSON response
    let parsedProducts: { products: DetectedProduct[] };
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedProducts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Error al parsear respuesta de OpenAI', raw: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and clean the products
    const cleanedProducts: DetectedProduct[] = (parsedProducts.products || [])
      .filter((p: any) => p.name && typeof p.price === 'number' && p.price > 0)
      .map((p: any) => ({
        name: String(p.name).trim().substring(0, 100),
        description: p.description ? String(p.description).trim().substring(0, 200) : null,
        price: Number(p.price),
        category: String(p.category || 'GENERAL').toUpperCase().trim()
      }));

    console.log(`Detected ${cleanedProducts.length} products`);

    return new Response(
      JSON.stringify({ products: cleanedProducts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-menu function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
