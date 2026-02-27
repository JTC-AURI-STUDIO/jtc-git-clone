import { useState } from "react";
import { Minus, Plus, QrCode } from "lucide-react";

export default function Credits() {
  const [credits, setCredits] = useState(1);
  const [showQR, setShowQR] = useState(false);
  
  const costPerCredit = 0.50;

  const handleDecrease = () => {
    if (credits > 1) {
      setCredits(credits - 1);
      setShowQR(false); // Reseta o QR code se a quantidade de créditos mudar
    }
  };

  const handleIncrease = () => {
    setCredits(credits + 1);
    setShowQR(false); // Reseta o QR code se a quantidade de créditos mudar
  };

  const handleGeneratePix = () => {
    setShowQR(true);
  };

  const total = (credits * costPerCredit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="container mx-auto p-4 max-w-md mt-10">
      <div className="border rounded-xl shadow-sm bg-card text-card-foreground">
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="font-semibold leading-none tracking-tight text-2xl">Loja de Créditos</h3>
          <p className="text-sm text-muted-foreground">Compre créditos para usar na plataforma.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-muted px-4 py-2 rounded-full text-sm font-medium text-foreground">
              1 Crédito = R$ 0,50
            </div>
            
            <div className="flex items-center space-x-6">
              <button 
                onClick={handleDecrease}
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 w-12"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="text-5xl font-bold w-20 text-center text-foreground">{credits}</div>
              <button 
                onClick={handleIncrease}
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground h-12 w-12"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-3xl font-black text-primary">
              {total}
            </div>
          </div>

          {showQR && (
            <div className="flex flex-col items-center space-y-4 p-6 border rounded-xl bg-muted/30 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                {/* Ícone representando o QR Code. Substitua por uma tag <img /> ao integrar com a API do PIX */}
                <QrCode className="w-48 h-48 text-zinc-900" strokeWidth={1} />
              </div>
              <p className="text-sm text-center text-muted-foreground font-medium">
                Escaneie o QR Code acima com o app do seu banco.
              </p>
              <div className="w-full bg-background p-3 rounded-lg border text-xs text-center font-mono break-all text-muted-foreground select-all">
                00020101021126580014br.gov.bcb.pix0136{credits * 100}1234567890520400005303986540550.005802BR5913...
              </div>
            </div>
          )}
        </div>
        <div className="p-6 pt-0">
          <button 
            onClick={handleGeneratePix}
            className="inline-flex items-center justify-center rounded-lg text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 w-full shadow-sm"
          >
            {showQR ? "Atualizar PIX" : "Gerar PIX Automático"}
          </button>
        </div>
      </div>
    </div>
  );
}
