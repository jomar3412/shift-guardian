import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(raw: string): string | null {
  const codeBlock = raw.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlock?.[1]) return codeBlock[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return raw.slice(firstBrace, lastBrace + 1);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageDataUrl, rawText } = await req.json();
    if (!imageDataUrl && !rawText) {
      return new Response(JSON.stringify({ error: "Provide imageDataUrl or rawText" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
    userParts.push({
      type: "text",
      text:
        "Extract a shift schedule from this content. Return strict JSON only with this shape: " +
        '{"rows":[{"name":"string","start":"HH:mm optional","end":"HH:mm optional","lunch":"HH:mm optional","position":"string optional"}],"notes":"string"} ' +
        "Use 24-hour HH:mm format for any times you can read. Keep row even when time is missing.",
    });
    if (rawText) userParts.push({ type: "text", text: `Raw schedule text:\n${rawText}` });
    if (imageDataUrl) userParts.push({ type: "image_url", image_url: { url: imageDataUrl } });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You convert schedule screenshots/text into structured shift rows. " +
              "The input may have one card per employee with initials, then name/position, then a time line. " +
              "Respond with strict JSON only and never include markdown.",
          },
          {
            role: "user",
            content: userParts,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return new Response(JSON.stringify({ error: "AI parse failed", details: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    const jsonString = extractJsonObject(content);
    if (!jsonString) {
      return new Response(JSON.stringify({ error: "No parseable JSON returned", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = safeJsonParse<{ rows?: Array<{ name?: string; start?: string; end?: string; lunch?: string; position?: string }>; notes?: string }>(jsonString);
    if (!parsed) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload returned", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = (parsed.rows ?? []).filter((row) => row?.name);
    return new Response(JSON.stringify({ rows, notes: parsed.notes ?? "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
