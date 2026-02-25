import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan');

  const handleProcessPayment = () => {
    toast.success('Pagamento processado com sucesso! (Simulação)');
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => navigate('/credits')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar aos planos
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Finalizar Compra
          </CardTitle>
          <CardDescription>
            Plano selecionado: <span className="font-bold uppercase">{planId || 'Nenhum'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Esta é uma tela de demonstração de pagamento. Clique no botão abaixo para simular a conclusão da compra.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            disabled={!planId} 
            onClick={handleProcessPayment}
          >
            Pagar Agora
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Payment;