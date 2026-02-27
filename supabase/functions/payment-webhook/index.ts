import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Pega a chave da variável de ambiente, ou usa a chave fornecida de fallback
const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "APP_USR-4757775638681233-121409-a6fffc10594538a848210b0d664ecba5-2356462137";

serve(async (req) => {
  try {
    // O Mercado Pago envia notificações sobre pagamentos para este Webhook.
    const url = new URL(req.url);
    const id = url.searchParams.get("data.id") || url.searchParams.get("id");
    const type = url.searchParams.get("type") || url.searchParams.get("topic");

    // Se for uma notificação de pagamento, vamos verificar na API oficial.
    if (type === "payment" && id) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
      });

      if (response.ok) {
        const paymentData = await response.json();
        
        // VERIFICAÇÃO AUTOMÁTICA: Confirma se o pagamento foi realmente aprovado
        if (paymentData.status === "approved") {
          console.log(`[VERIFICADO] Pagamento aprovado! ID do Pagamento: ${id}`);
          
          // TODO: Atualizar o banco de dados (Supabase) confirmando a compra do cliente
          /* Exemplo:
             const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
             await supabase.from('orders').update({ status: 'pago' }).eq('payment_id', id);
          */
        }
      }
    }

    // Retorna 200 OK para o Mercado Pago saber que recebemos a notificação
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
});
