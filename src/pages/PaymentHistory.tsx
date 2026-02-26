import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  credits_purchased: number;
}

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, credits_purchased")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    };

    void fetchTransactions();
  }, [user]);

  const handleCancel = async (transaction: Transaction) => {
    try {
      setCancelingId(transaction.id);
      const { data, error } = await supabase.functions.invoke("check-payment", {
        body: {
          payment_db_id: transaction.id,
          action: "cancel",
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao cancelar pagamento.");
      }

      setTransactions((prev) =>
        prev.map((item) =>
          item.id === transaction.id ? { ...item, status: "cancelled" } : item
        )
      );
      toast.success("Pagamento cancelado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar pagamento.");
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <Badge><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
      default:
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada.</p>
              ) : (
                transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">R$ {Number(transaction.amount).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.credits_purchased} créditos
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(transaction.status)}

                      {transaction.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/payment?credits=${transaction.credits_purchased}`)}
                          >
                            Pagar agora
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={cancelingId === transaction.id}
                            onClick={() => handleCancel(transaction)}
                          >
                            {cancelingId === transaction.id ? "Cancelando..." : "Cancelar"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentHistory;
