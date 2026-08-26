import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: hospitals } = await admin.from("hospitals").select("*");
    const { data: industries } = await admin.from("fabric_industries").select("*");
    const { data: fabricTypes } = await admin.from("fabric_types").select("*");
    const { data: colors } = await admin.from("colors").select("*");
    const { data: settings } = await admin.from("company_settings").select("*");
    const { data: contractModels } = await admin.from("contract_models").select("*");
    const { data: contracts } = await admin.from("contracts").select("*");
    const { data: products } = await admin.from("products").select("*");
    const { data: profiles } = await admin.from("profiles").select("*");

    const dump = {
      hospitals: hospitals || [],
      fabric_industries: industries || [],
      fabric_types: fabricTypes || [],
      colors: colors || [],
      company_settings: settings || [],
      contract_models: contractModels || [],
      contracts: contracts || [],
      products: products || [],
      profiles: profiles || [],
    };

    return new Response(JSON.stringify(dump), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
