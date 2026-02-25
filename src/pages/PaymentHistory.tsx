import { useState, useEffect } from "react";
import { ArrowLeft, Clock, CheckCircle2, XCircle, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type PaymentStatus = "pending" | "approved" | "cancelled";

interface PaymentRow {
  id: string;
  amount: number;
  credits_purchased: number;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; badgeClass: string }> = {
  pending: { label: "Aguardando", icon: Clock, badgeClass: "status-badge-processing" },
  approved: { label: "Aprovado", icon: CheckCircle2, badgeClass: "status-badge-success" },
  cancelled: { label: "Pedido cancelado", icon: XCircle, badgeClass: "status-badge-error" },
};

const PaymentHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedPayment && selectedPayment.status === "pending") {
      const createdAt = new Date(selectedPayment.created_at).getTime();
      const elapsedSecs = Math.floor((now - createdAt) / 1000);
      if (elapsedSecs >= 300 && !cancelling) {
        setSelectedPayment(null);
      }
    }
  }, [now, selectedPayment, cancelling]);

  useEffect(() => {
    if (!user) return;
    
    loadPayments(true);

    const channel = supabase
      .channel('payments_history_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments', filter: `user_id=eq.${user.id}` },
        (payload) => {
          loadPayments(false);
          if (payload.eventType === 'UPDATE' && payload.new.status === 'cancelled') {
             setSelectedPayment(prev => prev?.id === payload.new.id ? null : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadPayments = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  const handlePay = async (payment: PaymentRow) => {
    setCancelling(true);
    try {
      // Cancela o pedido antigo garantindo a permanência como cancelado, e obriga a criar novo pedido
      await supabase.from("payments").update({ status: "cancelled" }).eq("id", payment.id);
      navigate(`/payment?quantity=${payment.credits_purchased}`);
    } catch {
      toast.error("Erro ao gerar novo pedido de pagamento.");
      setCancelling(false);
    }
  };

  const getStatus = (s: string) => statusConfig[s] || statusConfig.pending;

  const visiblePayments = payments.filter(p => {
    if (p.status !== "pending") return true;
    const createdAt = new Date(p.created_at).getTime();
    const elapsedSecs = Math.floor((now - createdAt) / 1000);
    return elapsedSecs < 300;
  });

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
        <Link to="/dashboard" className="text-foreground">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-foreground font-bold text-lg">Histórico de Pagamentos</h1>
      </header>

      <main className="pt-20 px-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
        ) : visiblePayments.length === 0 ? (
          <div className="glass-card p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <CreditCard size={28} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhum pagamento encontrado.</p>
            <Link to="/credits" className="btn-primary-glow inline-block text-sm px-6 py-2.5">
              Comprar créditos
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {visiblePayments.map((p, i) => {
                const st = getStatus(p.status);
                const Icon = st.icon;
                const isPending = p.status === "pending";

                let timeString = "";
                if (isPending) {
                  const createdAt = new Date(p.created_at).getTime();
                  const elapsedSecs = Math.floor((now - createdAt) / 1000);
                  const timeLeft = Math.max(0, 300 - elapsedSecs);
                  const m = Math.floor(timeLeft / 60);
                  const s = timeLeft % 60;
                  timeString = `${m}:${s.toString().padStart(2, "0")}`;
                }

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => isPending && setSelectedPayment(p)}
                    className={`glass-card p-4 ${isPending ? "cursor-pointer glass-card-hover" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        p.status === "approved" ? "bg-[hsl(var(--success)/0.15)]" :
                        p.status === "cancelled" ? "bg-destructive/15" :
                        "bg-[hsl(var(--warning)/0.15)]"
                      }`}>
                        <Icon size={20} className={
                          p.status === "approved" ? "text-[hsl(var(--success))]" :
                          p.status === "cancelled" ? "text-destructive" :
                          "text-[hsl(var(--warning))]"
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm font-semibold">
                          {p.credits_purchased} crédito{p.credits_purchased > 1 ? "s" : ""}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(p.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-foreground text-sm font-bold">
                          R$ {Number(p.amount).toFixed(2).replace(".", ",")}
                        </p>
                        <div className="flex flex-col items-end gap-1 mt-1">
                          <span className={st.badgeClass}>{st.label}</span>
                          {isPending && (
                            <span className="text-xs font-mono text-[hsl(var(--warning))] flex items-center gap-1">
                              <Clock size={10} /> {timeString}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isPending && (
                      <p className="text-muted-foreground text-xs mt-2 text-center">Toque para ver opções</p>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Action modal for pending payments */}
        <AnimatePresence>
          {selectedPayment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
              onClick={() => !cancelling && setSelectedPayment(null)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="glass-card p-6 w-full max-w-sm gradient-border"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[hsl(var(--warning)/0.15)] flex items-center justify-center mx-auto mb-3">
                    <Clock size={28} className="text-[hsl(var(--warning))]" />
                  </div>
                  <h3 className="text-foreground font-bold text-lg">Pagamento Pendente</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedPayment.credits_purchased} crédito{selectedPayment.credits_purchased > 1 ? "s" : ""} — R$ {Number(selectedPayment.amount).toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {new Date(selectedPayment.created_at).toLocaleString("pt-BR")}
                  </p>
                  {selectedPayment.status === "pending" && (
                    (() => {
                      const createdAt = new Date(selectedPayment.created_at).getTime();
                      const elapsedSecs = Math.floor((now - createdAt) / 1000);
                      const timeLeft = Math.max(0, 300 - elapsedSecs);
                      const m = Math.floor(timeLeft / 60);
                      const s = timeLeft % 60;
                      return (
                        <p className="text-[hsl(var(--warning))] text-sm font-mono font-bold mt-2 flex items-center justify-center gap-1">
                          <Clock size={14} /> Expira em {m}:{s.toString().padStart(2, "0")}
                        </p>
                      );
                    })()
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handlePay(selectedPayment)}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                    Novo Pedido
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PaymentHistory;
