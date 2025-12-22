import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

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

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing menu with Lovable AI Gateway (Gemini)...');
    console.log('MIME type received:', mimeType);

    // Build the content array for the API
    const userContent: any[] = [
      {
        type: 'text',
        text: 'Analiza esta imagen de menú y extrae todos los productos con sus precios y categorías:'
      }
    ];

    // For PDFs, we need to send as file, for images we send as image_url
    if (mimeType === 'application/pdf') {
      userContent.push({
        type: 'file',
        file: {
          filename: 'menu.pdf',
          file_data: `data:${mimeType};base64,${imageBase64}`
        }
      });
    } else {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
        }
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
            content: userContent
          }
        ],
        max_tokens: 4096,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Error al procesar menú con IA', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'No se pudo extraer información del menú' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content);

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
      console.error('Error parsing AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Error al parsear respuesta de IA', raw: content }),
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
