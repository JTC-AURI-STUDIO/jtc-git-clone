import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Copy, CheckCircle2, Loader2, XCircle, Clock, ShieldCheck, QrCode, User, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

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
    payment_db_id: string;
  } | null>(null);
  const [status, setStatus] = useState<"checking_profile" | "needs_profile" | "generating" | "waiting" | "approved" | "error" | "cancelled">("checking_profile");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pollRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Profile form state
  const [formName, setFormName] = useState("");
  const [formCPF, setFormCPF] = useState("");
  const [saveAsDefault, setSaveAsDefault] = useState<boolean | null>(null);
  const [submittingProfile, setSubmittingProfile] = useState(false);

  useEffect(() => {
    if (user) checkProfile();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  // Listen to payment updates in realtime
  useEffect(() => {
    if (!pixData?.payment_db_id) return;
    
    const channel = supabase
      .channel(`payment_updates_${pixData.payment_db_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${pixData.payment_db_id}`,
        },
        (payload) => {
          if (payload.new.status === 'cancelled') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setStatus("cancelled");
            toast.error("Pagamento cancelado permanentemente.");
          } else if (payload.new.status === 'approved') {
            if (pollRef.current) clearInterval(pollRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setStatus("approved");
            toast.success("Pagamento aprovado! Créditos adicionados. 🎉");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pixData?.payment_db_id]);

  // Elapsed timer
  useEffect(() => {
    if (status === "waiting") {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [status]);

  const checkProfile = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name, cpf")
        .eq("user_id", user!.id)
        .single();

      if (data?.name && data?.cpf) {
        // Profile complete, proceed to generate PIX
        setStatus("generating");
        generatePix();
      } else {
        // Pre-fill with existing data
        if (data?.name) setFormName(data.name);
        if (data?.cpf) setFormCPF(data.cpf);
        setStatus("needs_profile");
        setLoading(false);
      }
    } catch {
      setStatus("needs_profile");
      setLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    const cpfDigits = formCPF.replace(/\D/g, "");
    if (!formName.trim() || cpfDigits.length !== 11) {
      toast.error("Preencha nome completo e CPF válido (11 dígitos).");
      return;
    }
    setSaveAsDefault(null); // show the question
  };

  const handleSaveChoice = async (save: boolean) => {
    setSaveAsDefault(save);
    setSubmittingProfile(true);

    try {
      if (save) {
        await supabase
          .from("profiles")
          .update({ name: formName.trim(), cpf: formCPF.replace(/\D/g, "") })
          .eq("user_id", user!.id);
        toast.success("Dados salvos como padrão!");
      }
      setStatus("generating");
      generatePix();
    } catch {
      toast.error("Erro ao salvar dados.");
    } finally {
      setSubmittingProfile(false);
    }
  };

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
        payment_db_id: data.payment_db_id,
      });
      setStatus("waiting");
      startPolling(data.payment_id, data.payment_db_id);
    } catch (err: any) {
      setStatus("error");
      toast.error(err.message || "Erro ao gerar PIX.");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (paymentId: string, paymentDbId: string) => {
    let attempts = 0;
    pollRef.current = window.setInterval(async () => {
      attempts++;
      try {
        const { data } = await supabase.functions.invoke("check-payment", {
          body: { payment_id: paymentId, payment_db_id: paymentDbId },
        });
        if (data?.approved) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStatus("approved");
          toast.success("Pagamento aprovado! Créditos adicionados. 🎉");
        } else if (data?.status === "cancelled") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setStatus("cancelled");
          toast.error("Pagamento cancelado permanentemente.");
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

  const handleCancelPayment = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (pixData?.payment_db_id) {
      try {
        await supabase.from("payments").update({ status: "cancelled" }).eq("id", pixData.payment_db_id);
      } catch (err) {
        console.error("Erro ao cancelar no backend:", err);
      }
    }
    setStatus("cancelled");
    toast.error("Pedido cancelado permanentemente.");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const showSaveQuestion = saveAsDefault === null && submittingProfile === false && formName.trim() && formCPF.replace(/\D/g, "").length === 11;

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
          {/* Checking profile */}
          {status === "checking_profile" && (
            <div className="glass-card p-10 text-center space-y-6 gradient-border">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto"
              >
                <Loader2 size={32} className="text-primary" />
              </motion.div>
              <div>
                <h2 className="text-foreground font-bold text-xl mb-2">Verificando dados...</h2>
                <p className="text-muted-foreground text-sm">Aguarde um momento</p>
              </div>
            </div>
          )}

          {/* Needs profile - form */}
          {status === "needs_profile" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Warning card */}
              <div className="glass-card p-5 gradient-border">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--warning)/0.15)] flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-[hsl(var(--warning))]" />
                  </div>
                  <div>
                    <h2 className="text-foreground font-bold text-lg mb-1">Dados necessários</h2>
                    <p className="text-muted-foreground text-sm">
                      Para realizar uma compra via PIX, é necessário informar seu nome completo e CPF.
                    </p>
                  </div>
                </div>
              </div>

              {/* Form card */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <User size={20} className="text-primary" />
                  </div>
                  <h3 className="text-foreground font-bold">Preencha seus dados</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-muted-foreground text-xs mb-2 uppercase tracking-wider font-medium">
                      Nome completo
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Seu nome completo"
                      className="input-dark w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-muted-foreground text-xs mb-2 uppercase tracking-wider font-medium">
                      CPF
                    </label>
                    <input
                      type="text"
                      value={formCPF}
                      onChange={(e) => setFormCPF(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="input-dark w-full"
                      maxLength={14}
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {!showSaveQuestion ? (
                      <motion.button
                        key="submit"
                        onClick={handleProfileSubmit}
                        disabled={submittingProfile}
                        className="btn-primary-glow w-full flex items-center justify-center gap-2"
                      >
                        {submittingProfile ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Continuar para pagamento"
                        )}
                      </motion.button>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {/* Save as default question */}
              <AnimatePresence>
                {showSaveQuestion && saveAsDefault === null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="glass-card p-6 text-center gradient-border"
                  >
                    <p className="text-foreground font-semibold mb-4">
                      Deseja utilizar essas informações como padrão para as próximas compras?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSaveChoice(true)}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => handleSaveChoice(false)}
                        className="flex-1 py-3 rounded-xl font-semibold text-sm bg-secondary text-muted-foreground border border-border hover:bg-border transition-all"
                      >
                        Não
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

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
          
          {/* Cancelled state */}
          <AnimatePresence>
            {status === "cancelled" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-10 text-center space-y-6 gradient-border"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center mx-auto"
                >
                  <XCircle size={40} className="text-destructive" />
                </motion.div>
                <div>
                  <h2 className="text-foreground font-bold text-2xl mb-2">Pedido Cancelado</h2>
                  <p className="text-muted-foreground text-sm mb-1">
                    O pagamento foi cancelado permanentemente.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="btn-primary-glow px-8 w-full"
                >
                  Voltar ao Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
                onClick={handleCancelPayment}
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
