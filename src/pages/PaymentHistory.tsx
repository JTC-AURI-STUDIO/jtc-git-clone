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
  cancelled: { label: "Cancelado", icon: XCircle, badgeClass: "status-badge-error" },
};

const PaymentHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user) loadPayments();
  }, [user]);

  const loadPayments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  const handleCancel = async (payment: PaymentRow) => {
    setCancelling(true);
    try {
      await supabase.from("payments").update({ status: "cancelled" }).eq("id", payment.id);
      toast.success("Pagamento cancelado.");
      setSelectedPayment(null);
      loadPayments();
    } catch {
      toast.error("Erro ao cancelar pagamento.");
    } finally {
      setCancelling(false);
    }
  };

  const handlePay = (payment: PaymentRow) => {
    navigate(`/payment?quantity=${payment.credits_purchased}`);
  };

  const getStatus = (s: string) => statusConfig[s] || statusConfig.pending;

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
        ) : payments.length === 0 ? (
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
            {payments.map((p, i) => {
              const st = getStatus(p.status);
              const Icon = st.icon;
              const isPending = p.status === "pending";

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
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
                      <span className={st.badgeClass}>{st.label}</span>
                    </div>
                  </div>

                  {isPending && (
                    <p className="text-muted-foreground text-xs mt-2 text-center">Toque para ver opções</p>
                  )}
                </motion.div>
              );
            })}
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
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCancel(selectedPayment)}
                    disabled={cancelling}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {cancelling ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Cancelar
                  </button>
                  <button
                    onClick={() => handlePay(selectedPayment)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CreditCard size={16} />
                    Pagar
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
