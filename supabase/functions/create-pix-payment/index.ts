import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email;
    const { quantity, cpf } = await req.json();

    if (!quantity || quantity < 1) {
      throw new Error("Quantidade inválida");
    }

    const amount = quantity * 0.5;

    // Get user profile for CPF
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, cpf")
      .eq("user_id", userId)
      .single();

    const payerCpf = cpf || profile?.cpf || "";
    const payerName = profile?.name || "Usuário";

    // Create PIX payment via Mercado Pago
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description: `${quantity} crédito${quantity > 1 ? "s" : ""} - JTC RemixHub`,
        payment_method_id: "pix",
        payer: {
          email: userEmail,
          first_name: payerName,
          identification: {
            type: "CPF",
            number: payerCpf.replace(/\D/g, ""),
          },
        },
      }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("Mercado Pago error:", JSON.stringify(mpData));
      throw new Error(`Mercado Pago API error [${mpResponse.status}]: ${JSON.stringify(mpData)}`);
    }

    // Save payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount,
        credits_purchased: quantity,
        status: mpData.status === "approved" ? "approved" : "pending",
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Payment insert error:", paymentError);
    }

    // If approved immediately (unlikely for PIX but possible)
    if (mpData.status === "approved") {
      await supabase.rpc("add_credits", { p_user_id: userId, p_amount: quantity });
    }

    const pixInfo = mpData.point_of_interaction?.transaction_data;

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: mpData.id,
        status: mpData.status,
        qr_code: pixInfo?.qr_code || "",
        qr_code_base64: pixInfo?.qr_code_base64 || "",
        ticket_url: pixInfo?.ticket_url || "",
        payment_db_id: payment?.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
