import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, ArrowLeft, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PLAN_CREDITS: Record<string, number> = {
  starter: 100,
  pro: 500,
  enterprise: 1500,
};

type PaymentStatus = 'idle' | 'pending' | 'approved' | 'cancelled';

const Payment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const planId = searchParams.get('plan') || '';
  const creditsParam = Number(searchParams.get('credits') || '0');

  const credits = useMemo(() => {
    if (creditsParam > 0) return creditsParam;
    return PLAN_CREDITS[planId] || 0;
  }, [creditsParam, planId]);

  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentDbId, setPaymentDbId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [qrCodeBase64, setQrCodeBase64] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');

  const createPixPayment = async () => {
    if (!credits) {
      toast.error('Selecione um plano válido.');
      return;
    }

    try {
      setCreating(true);
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: { quantity: credits },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Falha ao gerar pagamento PIX.');
      }

      setPaymentId(data.payment_id ? String(data.payment_id) : null);
      setPaymentDbId(data.payment_db_id ? String(data.payment_db_id) : null);
      setQrCode(data.qr_code || '');
      setQrCodeBase64(data.qr_code_base64 || '');
      setTicketUrl(data.ticket_url || '');
      setStatus(data.status === 'approved' ? 'approved' : 'pending');

      if (data.status === 'approved') {
        toast.success('Pagamento aprovado! Créditos adicionados.');
      } else {
        toast.success('PIX gerado! Finalize o pagamento para liberar os créditos.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar pagamento.';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId || status !== 'pending') return;

    const { data, error } = await supabase.functions.invoke('check-payment', {
      body: {
        payment_id: paymentId,
        payment_db_id: paymentDbId,
      },
    });

    if (error || data?.error) return;

    if (data.status === 'approved') {
      setStatus('approved');
      toast.success('Pagamento aprovado! Créditos adicionados.');
      return;
    }

    if (data.status === 'cancelled') {
      setStatus('cancelled');
      toast.error('Pagamento cancelado.');
    }
  };

  useEffect(() => {
    if (status !== 'pending' || !paymentId) return;

    const interval = window.setInterval(() => {
      void checkPaymentStatus();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [status, paymentId, paymentDbId]);

  const handleCancelPayment = async () => {
    if (!paymentDbId && !paymentId) return;

    try {
      setCancelling(true);
      const { data, error } = await supabase.functions.invoke('check-payment', {
        body: {
          payment_id: paymentId,
          payment_db_id: paymentDbId,
          action: 'cancel',
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Não foi possível cancelar.');
      }

      setStatus('cancelled');
      toast.success('Pagamento cancelado com sucesso.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao cancelar pagamento.';
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!qrCode) return;
    await navigator.clipboard.writeText(qrCode);
    toast.success('Código PIX copiado!');
  };

  const statusBadge =
    status === 'approved' ? (
      <Badge>Aprovado</Badge>
    ) : status === 'cancelled' ? (
      <Badge variant="destructive">Cancelado</Badge>
    ) : status === 'pending' ? (
      <Badge variant="secondary">Aguardando pagamento</Badge>
    ) : null;

  return (
    <div className="container mx-auto py-12 px-4 max-w-xl">
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
            {credits > 0
              ? `Você está comprando ${credits} créditos.`
              : 'Selecione um plano para continuar.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {statusBadge}

          {qrCodeBase64 ? (
            <img
              src={`data:image/png;base64,${qrCodeBase64}`}
              alt="QR Code PIX para pagamento"
              loading="lazy"
              className="w-56 h-56 mx-auto rounded-md border border-border"
            />
          ) : null}

          {qrCode ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Código PIX:</p>
              <textarea
                value={qrCode}
                readOnly
                className="w-full min-h-24 rounded-md border border-input bg-background p-3 text-sm"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Gere o PIX para visualizar o QR Code e concluir a compra.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2">
          <Button onClick={createPixPayment} disabled={creating || !credits || status === 'pending'}>
            {creating ? 'Gerando PIX...' : status === 'cancelled' ? 'Gerar novo PIX' : 'Gerar PIX'}
          </Button>

          {qrCode ? (
            <Button variant="outline" onClick={handleCopyPixCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar código
            </Button>
          ) : null}

          {ticketUrl ? (
            <Button variant="outline" asChild>
              <a href={ticketUrl} target="_blank" rel="noreferrer">
                Abrir comprovante
              </a>
            </Button>
          ) : null}

          {status === 'pending' ? (
            <Button variant="destructive" onClick={handleCancelPayment} disabled={cancelling}>
              {cancelling ? 'Cancelando...' : 'Cancelar'}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Payment;
