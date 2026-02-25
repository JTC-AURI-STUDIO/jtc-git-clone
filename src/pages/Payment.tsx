import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<"paying" | "completed">("paying");
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const transactionId = searchParams.get("id");
  const amountParam = searchParams.get("amount");

  useEffect(() => {
    const setupPayment = async () => {
      if (!user) return;

      if (transactionId) {
        // Carrega transação existente do histórico
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", transactionId)
          .single();

        if (error || !data) {
          toast.error("Transação não encontrada");
          navigate("/history");
          return;
        }
        setTransaction(data);
        if (data.status === "completed" || data.status === "approved") {
          setStatus("completed");
        }
      } else if (amountParam) {
        // Cria nova transação vinda da tela de créditos
        const { data, error } = await supabase
          .from("transactions")
          .insert([
            {
              user_id: user.id,
              amount: parseFloat(amountParam),
              status: "pending"
            }
          ])
          .select()
          .single();

        if (error) {
          toast.error("Erro ao iniciar pagamento");
          navigate("/credits");
          return;
        }
        setTransaction(data);
      } else {
        navigate("/credits");
      }
      setLoading(false);
    };

    setupPayment();
  }, [transactionId, amountParam, user, navigate]);

  const handleSimulatePayment = async () => {
    if (!transaction) return;

    const { error } = await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", transaction.id);

    if (error) {
      toast.error("Erro ao processar pagamento");
      return;
    }

    setStatus("completed");
    toast.success("Pagamento aprovado!");
  };

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/history")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle>{status === "paying" ? "Pagamento PIX" : "Pagamento Concluído"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center text-center space-y-6">
          {status === "paying" ? (
            <>
              <div className="bg-muted p-8 rounded-lg">
                <QrCode className="w-48 h-48" />
              </div>
              <div className="space-y-2 w-full">
                <p className="text-sm text-muted-foreground">Valor: R$ {transaction?.amount.toFixed(2)}</p>
                <div className="flex items-center gap-2 p-3 bg-accent rounded-md select-all cursor-pointer group" 
                     onClick={() => { 
                       navigator.clipboard.writeText("codigo-pix-simulado");
                       toast.success("Código copiado!");
                     }}>
                  <code className="text-xs flex-1 truncate">00020101021226850014BR.GOV.BCB.PIX...</code>
                  <Copy className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </div>
              <Button className="w-full" onClick={handleSimulatePayment}>
                Confirmar Pagamento (Simulação)
              </Button>
            </>
          ) : (
            <>
              <div className="p-6 bg-green-100 rounded-full">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Tudo pronto!</h3>
                <p className="text-muted-foreground">Seu pagamento foi processado com sucesso e os créditos foram adicionados.</p>
              </div>
              <Button className="w-full" onClick={() => navigate("/dashboard")}>
                Ir para o Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payment;