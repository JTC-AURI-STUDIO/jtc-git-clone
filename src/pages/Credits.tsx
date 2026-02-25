import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Minus, Plus, Coins, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";

const PRICE_PER_CREDIT = 0.5;
const QUICK_OPTIONS = [5, 10, 25, 50, 100];

const Credits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [quantity, setQuantity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) loadCredits();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  const loadCredits = async () => {
    const { data } = await supabase.from("credits").select("balance").eq("user_id", user!.id).single();
    if (data) setCredits(data.balance);
  };

  const total = (quantity * PRICE_PER_CREDIT).toFixed(2).replace(".", ",");

  const handleBuy = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pix-payment", {
        body: { quantity },
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);

      setPixData({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        payment_id: data.payment_id,
      });

      // Start polling for payment status
      startPolling(data.payment_id);
      toast.success("PIX gerado! Escaneie o QR Code ou copie o código.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId: string) => {
    setChecking(true);
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("check-payment", {
          body: { payment_id: paymentId },
        });

        if (data?.approved) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setChecking(false);
          setPixData(null);
          loadCredits();
          toast.success("Pagamento aprovado! Créditos adicionados.");
        }
      } catch {
        // Ignore polling errors
      }

      if (attempts >= 60) {
        // Stop after 5 minutes
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setChecking(false);
      }
    }, 5000);
  };

  const copyPixCode = async () => {
    if (pixData?.qr_code) {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <AppHeader credits={credits} />

      <main className="pt-20 px-4 max-w-lg mx-auto">
        <h1 className="text-foreground font-bold text-xl mb-1">Loja de Créditos</h1>
        <p className="text-muted-foreground text-sm mb-6">Adquira créditos para utilizar nos seus remixes.</p>

        {/* PIX Payment Modal */}
        {pixData && (
          <div className="glass-card p-6 mb-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
                <Coins size={20} className="text-success" />
              </div>
              <div>
                <h2 className="text-foreground font-bold">Pagamento PIX</h2>
                <p className="text-muted-foreground text-xs">Escaneie ou copie o código</p>
              </div>
            </div>

            {pixData.qr_code_base64 && (
              <div className="flex justify-center bg-foreground rounded-xl p-4">
                <img
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              </div>
            )}

            {pixData.qr_code && (
              <div>
                <label className="block text-primary text-xs mb-1.5">Código PIX (Copia e Cola)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixData.qr_code}
                    readOnly
                    className="input-dark flex-1 text-xs"
                  />
                  <button
                    onClick={copyPixCode}
                    className="px-3 py-2 bg-primary rounded-lg text-primary-foreground"
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}

            {checking && (
              <div className="flex items-center justify-center gap-2 text-primary text-sm">
                <Loader2 size={16} className="animate-spin" />
                Aguardando pagamento...
              </div>
            )}

            <button
              onClick={() => {
                setPixData(null);
                if (pollRef.current) clearInterval(pollRef.current);
                setChecking(false);
              }}
              className="text-muted-foreground text-sm underline w-full text-center"
            >
              Cancelar
            </button>
          </div>
        )}

        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <ShoppingCart size={20} className="text-primary" />
              </div>
              <h2 className="text-foreground font-bold">Loja de Créditos</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full">
              <Coins size={14} className="text-warning" />
              <span className="text-foreground text-sm">{credits}</span>
            </div>
          </div>

          {/* Price card */}
          <div className="bg-secondary/50 border border-border rounded-xl p-5 text-center">
            <p className="text-muted-foreground text-sm mb-1">Preço por crédito</p>
            <p className="text-foreground text-3xl font-bold">R$ 0,50</p>
            <p className="text-muted-foreground text-xs mt-1">1 crédito = 1 remix</p>
          </div>

          {/* Quantity selector */}
          <div>
            <label className="block text-primary text-sm mb-3">Quantidade de créditos</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-dark flex-1 text-center text-lg font-bold"
                min={1}
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              {QUICK_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className={`flex-1 py-1.5 rounded-full text-sm transition-colors border ${
                    quantity === n
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-secondary/50 border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground text-2xl font-bold">R$ {total}</span>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBuy}
            disabled={loading || !!pixData}
            className="btn-primary-glow w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            {loading ? "Gerando PIX..." : `Comprar ${quantity} créditos`}
          </button>
        </div>

        <footer className="text-center text-muted-foreground text-xs py-6">
          <p>
            Sistema desenvolvido por <span className="text-foreground font-medium">Jardiel De Sousa Lopes</span> — Criador da{" "}
            <span className="text-primary">JTC</span>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Credits;
