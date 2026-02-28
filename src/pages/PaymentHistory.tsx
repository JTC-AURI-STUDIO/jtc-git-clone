import { useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, XCircle, Filter, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  credits_purchased: number;
  mercadopago_payment_id?: string;
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'cancelled';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, status, created_at, credits_purchased, mercadopago_payment_id")
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
          payment_id: transaction.mercadopago_payment_id,
          action: "cancel",
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao cancelar pagamento.");
      }

      setTransactions((prev) =>
        prev.map((item) => (item.id === transaction.id ? { ...item, status: 'cancelled' } : item))
      );
      toast.success("Pagamento cancelado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar pagamento.");
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) { // Convert to lowercase for comparison
      case "completed":
      case "approved":
        return <Badge className="bg-green-500 hover:bg-green-500/80"><CheckCircle2 className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') {
      return transactions;
    }
    return transactions.filter(t => {
      const statusLowerCase = t.status.toLowerCase();
      // Check for both 'approved' and 'completed' when filter is 'approved'
      if (filter === 'approved') {
        return statusLowerCase === 'approved' || statusLowerCase === 'completed';
      }
      return statusLowerCase === filter;
    });
  }, [transactions, filter]);

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Histórico de Pagamentos</CardTitle>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(value: FilterStatus) => setFilter(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Carregando...</p>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-muted-foreground">
                  <PackageOpen className="w-12 h-12 mb-4" />
                  <p className="text-lg">Nenhuma transação encontrada</p>
                  {filter !== 'all' && (
                    <p className="text-sm">para o status "{filter}".</p>
                  )}
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 border rounded-lg bg-card shadow-sm"
                  >
                    <div>
                      <p className="font-medium text-lg">R$ {Number(transaction.amount).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {transaction.credits_purchased} créditos
                      </p>
                      <p className="text-xs text-muted-foreground">
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

                      {transaction.status.toLowerCase() === "pending" && ( // Convert to lowercase
                        <Button
                          size="sm"
                          onClick={() =>
                            navigate(`/payment?payment_db_id=${transaction.id}&credits=${transaction.credits_purchased}&payment_id=${transaction.mercadopago_payment_id}`)
                          }
                        >
                          Pagar agora
                        </Button>
                      )}
                      {transaction.status.toLowerCase() === "pending" && ( // Convert to lowercase
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={cancelingId === transaction.id}
                          onClick={() => handleCancel(transaction)}
                        >
                          {cancelingId === transaction.id ? "Cancelando..." : "Cancelar"}
                        </Button>
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
