import { useState, useEffect } from "react";
import { ArrowLeft, Save, CheckCircle2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
      loadPayments();
    }
  }, [user]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
    if (data) {
      setName(data.name);
      setCpf(data.cpf || "");
    }
  };

  const loadPayments = async () => {
    const { data } = await supabase.from("payments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setPayments(data);
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await supabase.from("profiles").update({ name, cpf }).eq("user_id", user!.id);
      toast.success("Perfil atualizado!");
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
        <Link to="/dashboard" className="text-foreground">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-foreground font-bold text-lg">Perfil</h1>
      </header>

      <main className="pt-20 px-4 max-w-lg mx-auto space-y-6">
        {/* Profile form */}
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="block text-primary text-sm mb-1.5">Email</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="input-dark w-full opacity-60"
            />
          </div>
          <div>
            <label className="block text-primary text-sm mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-dark w-full"
            />
          </div>
          <div>
            <label className="block text-primary text-sm mb-1.5 flex items-center gap-1.5">
              <CreditCard size={14} />
              CPF (usado nos pagamentos PIX)
            </label>
            <input
              type="text"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="input-dark w-full"
            />
            <p className="text-muted-foreground text-xs mt-1">Altere aqui o CPF salvo para pagamentos.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn-primary-glow flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </div>

        {/* Payment history */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <CreditCard size={20} className="text-primary" />
            </div>
            <h2 className="text-foreground font-bold">Histórico de Pagamentos</h2>
          </div>

          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">Nenhum pagamento encontrado.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border-t border-border pt-3">
                  <CheckCircle2 size={18} className="text-success flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-foreground text-sm font-medium">{p.credits_purchased} crédito{p.credits_purchased > 1 ? "s" : ""}</p>
                    <p className="text-muted-foreground text-xs">{new Date(p.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground text-sm font-semibold">R$ {Number(p.amount).toFixed(2).replace(".", ",")}</p>
                    <span className="status-badge-success">{p.status === "approved" ? "Aprovado" : p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
