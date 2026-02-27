import { useState } from "react";
import { Minus, Plus, QrCode } from "lucide-react";

export function CreditPurchase() {
  const [credits, setCredits] = useState(1);
  const [showQrCode, setShowQrCode] = useState(false);
  const pricePerCredit = 0.50;

  const handleIncrease = () => setCredits(c => c + 1);
  const handleDecrease = () => setCredits(c => Math.max(1, c - 1));

  const totalAmount = credits * pricePerCredit;

  const handleGeneratePix = () => {
    setShowQrCode(true);
    // NOTA: Aqui você faria a requisição para a sua API de pagamento (MercadoPago, Stripe, etc.) para gerar a chave copia e cola / qr code real do PIX.
  };

  return (
    <div className="w-full max-w-md mx-auto bg-card text-card-foreground rounded-xl border shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="font-semibold leading-none tracking-tight text-2xl">Comprar Créditos</h3>
        <p className="text-sm text-muted-foreground">Cada crédito custa R$ 0,50</p>
      </div>
      
      <div className="p-6 pt-0 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">Quantidade</span>
          <div className="flex items-center space-x-2">
            <button 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 disabled:opacity-50"
              onClick={handleDecrease} 
              disabled={credits <= 1 || showQrCode}
            >
              <Minus className="h-4 w-4" />
            </button>
            <input 
              type="number" 
              value={credits} 
              onChange={(e) => setCredits(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={showQrCode}
              className="flex h-10 w-20 rounded-md border border-input bg-background px-3 py-2 text-sm text-center ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <button 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 w-10 disabled:opacity-50"
              onClick={handleIncrease}
              disabled={showQrCode}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-4 border-t border-b">
          <span className="text-lg font-medium">Total a Pagar</span>
          <span className="text-2xl font-bold">
            R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {showQrCode && (
          <div className="flex flex-col items-center space-y-4 pt-4 animate-in fade-in">
            <div className="p-4 bg-white rounded-xl border">
              <div className="w-48 h-48 bg-muted flex flex-col items-center justify-center text-muted-foreground rounded-lg border-2 border-dashed">
                <QrCode className="h-12 w-12 mb-2" />
                <span className="text-sm text-center px-4">QR Code do PIX</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Escaneie o QR code pelo aplicativo do seu banco para pagar. O pagamento será processado automaticamente.
            </p>
          </div>
        )}
      </div>
      
      <div className="flex items-center p-6 pt-0">
        <button 
          className="inline-flex w-full items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 disabled:opacity-50 transition-colors"
          onClick={handleGeneratePix} 
          disabled={showQrCode}
        >
          {showQrCode ? 'Aguardando Pagamento...' : 'Gerar PIX para Pagamento'}
        </button>
      </div>
    </div>
  );
}
