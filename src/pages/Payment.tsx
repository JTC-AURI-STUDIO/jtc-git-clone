import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Copy, CheckCircle2, Loader2, XCircle, Clock, ShieldCheck, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Payment = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quantity = parseInt(searchParams.get("quantity") || "10");
  const amount = (quantity * 0.5).toFixed(2).replace(".", ",");

  const [loading, setLoading] = useState(true);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
  } | null>(null);
  const [status, setStatus] = useState<"generating" | "waiting" | "approved" | "error">("generating");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (user) generatePix();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  // Elapsed timer
  useEffect(() => {
    if (status === "waiting") {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [status]);

  const generatePix = async () => {
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
      setStatus("waiting");
      startPolling(data.payment_id);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId: string) => {
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
          setStatus("approved");
          toast.success("Pagamento aprovado! Créditos adicionados. 🎉");
        }
      } catch { /* ignore */ }
      if (attempts >= 120) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
      }
    }, 5000);
  };

  const copyPixCode = async () => {
    if (pixData?.qr_code) {
      await navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SpaceBackground />

      {/* Top bar */}
      <div className="relative z-10 flex items-center px-4 py-4">
        <button
          onClick={() => navigate("/credits")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Voltar</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Generating state */}
          {status === "generating" && (
            <div className="glass-card p-10 text-center space-y-6 gradient-border">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto"
              >
                <Loader2 size={32} className="text-primary" />
              </motion.div>
              <div>
                <h2 className="text-foreground font-bold text-xl mb-2">Gerando PIX...</h2>
                <p className="text-muted-foreground text-sm">Aguarde enquanto preparamos seu pagamento</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {status === "error" && (
            <div className="glass-card p-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-destructive/15 flex items-center justify-center mx-auto">
                <XCircle size={32} className="text-destructive" />
              </div>
              <div>
                <h2 className="text-foreground font-bold text-xl mb-2">Erro ao gerar PIX</h2>
                <p className="text-muted-foreground text-sm">Tente novamente ou entre em contato com o suporte.</p>
              </div>
              <button onClick={() => navigate("/credits")} className="btn-primary-glow px-8">
                Voltar à loja
              </button>
            </div>
          )}

          {/* Approved state */}
          <AnimatePresence>
            {status === "approved" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-10 text-center space-y-6 gradient-border"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-[hsl(var(--success)/0.15)] flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 size={40} className="text-[hsl(var(--success))]" />
                </motion.div>
                <div>
                  <h2 className="text-foreground font-bold text-2xl mb-2">Pagamento Aprovado! 🎉</h2>
                  <p className="text-muted-foreground text-sm mb-1">
                    <span className="text-[hsl(var(--success))] font-bold text-lg">{quantity}</span> créditos adicionados à sua conta
                  </p>
                  <p className="text-muted-foreground text-xs">Processado em {formatTime(elapsed)}</p>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn-primary-glow px-8 w-full"
                >
                  Ir para o Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Waiting for payment */}
          {status === "waiting" && pixData && (
            <div className="space-y-5">
              {/* Header card */}
              <div className="glass-card p-6 gradient-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <QrCode size={22} className="text-primary" />
                    </div>
                    <div>
                      <h2 className="text-foreground font-bold text-lg">Pagamento PIX</h2>
                      <p className="text-muted-foreground text-xs">Escaneie ou copie o código abaixo</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground font-bold text-xl">R$ {amount}</p>
                    <p className="text-muted-foreground text-xs">{quantity} crédito{quantity > 1 ? "s" : ""}</p>
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 bg-secondary/50 rounded-xl py-2.5">
                  <Clock size={14} className="text-primary" />
                  <span className="text-muted-foreground text-sm">Aguardando há</span>
                  <span className="text-foreground font-mono font-bold text-sm">{formatTime(elapsed)}</span>
                </div>
              </div>

              {/* QR Code card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6 text-center"
              >
                {pixData.qr_code_base64 && (
                  <div className="relative inline-block mb-5">
                    <div className="bg-white rounded-2xl p-5 shadow-[0_0_60px_hsl(var(--purple-glow)/0.15)]">
                      <img
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="w-52 h-52"
                      />
                    </div>
                    {/* Scanning animation */}
                    <motion.div
                      className="absolute left-5 right-5 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                      animate={{ top: ["20%", "80%", "20%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 text-primary text-sm mb-2">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Aguardando pagamento...</span>
                </div>
              </motion.div>

              {/* Copy code card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-5"
              >
                <label className="block text-muted-foreground text-xs mb-2 uppercase tracking-wider font-medium">
                  Código PIX Copia e Cola
                </label>
                <div className="bg-input rounded-xl p-3 mb-3 break-all">
                  <p className="text-foreground text-xs font-mono leading-relaxed line-clamp-3">
                    {pixData.qr_code}
                  </p>
                </div>
                <button
                  onClick={copyPixCode}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    copied
                      ? "bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))] border border-[hsl(var(--success)/0.3)]"
                      : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={18} />
                      Código copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      Copiar código PIX
                    </>
                  )}
                </button>
              </motion.div>

              {/* Security badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 text-muted-foreground text-xs"
              >
                <ShieldCheck size={14} />
                <span>Pagamento seguro via Mercado Pago</span>
              </motion.div>

              {/* Cancel */}
              <button
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  navigate("/credits");
                }}
                className="text-muted-foreground text-sm underline w-full text-center hover:text-foreground transition-colors"
              >
                Cancelar pagamento
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Payment;
