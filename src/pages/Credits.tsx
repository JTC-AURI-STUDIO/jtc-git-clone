import { useState } from "react";
import { Minus, Plus, QrCode } from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";

export default function Credits() {
  const [credits, setCredits] = useState(1);
  const [showQR, setShowQR] = useState(false);
  
  const costPerCredit = 0.50;

  const handleDecrease = () => {
    if (credits > 1) {
      setCredits(credits - 1);
      setShowQR(false); // Reseta o QR code se a quantidade de crÃ©ditos mudar
    }
  };

  const handleIncrease = () => {
    setCredits(credits + 1);
    setShowQR(false); // Reseta o QR code se a quantidade de crÃ©ditos mudar
  };

  const handleGeneratePix = () => {
    setShowQR(true);
  };

  const total = (credits * costPerCredit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SpaceBackground />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-bold text-4xl text-primary">Loja de Créditos</h1>
          <p className="text-muted-foreground mt-2 text-lg">Recarregue seus créditos e continue remixando!</p>
        </div>

        <div className="glass-card p-6">
          <div className="flex flex-col items-center space-y-6 mb-8">
            <div className="bg-primary/10 px-4 py-2 rounded-full text-base font-medium text-primary border border-primary/20">
              1 Crédito = R$ 0,50
            </div>
            
            <div className="flex items-center space-x-6">
              <button 
                onClick={handleDecrease}
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-muted hover:text-accent-foreground h-14 w-14 text-primary text-xl shadow-sm hover:shadow-md"
              >
                <Minus className="h-6 w-6" />
              </button>
              <div className="text-6xl font-extrabold w-20 text-center text-foreground animate-pulse duration-500">{credits}</div>
              <button 
                onClick={handleIncrease}
                className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-muted hover:text-accent-foreground h-14 w-14 text-primary text-xl shadow-sm hover:shadow-md"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
            
            <div className="text-5xl font-black text-primary animate-bounce-slow">
              {total}
            </div>
          </div>

          {showQR && (
            <div className="flex flex-col items-center space-y-4 p-6 border rounded-xl bg-muted/30 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-primary/50 relative group">
                {/* Ícone representando o QR Code. Substitua por uma tag <img /> ao integrar com a API do PIX */}
                <QrCode className="w-52 h-52 text-zinc-900" strokeWidth={1} />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-center text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Clique para copiar
                </span>
              </div>
              <p className="text-sm text-center text-muted-foreground font-medium">
                Escaneie o QR Code acima com o app do seu banco para finalizar a compra.
              </p>
              <div className="w-full bg-background p-3 rounded-lg border text-xs text-center font-mono break-all text-muted-foreground select-all shadow-inner">
                00020101021126580014br.gov.bcb.pix0136{credits * 100}1234567890520400005303986540550.005802BR5913...
              </div>
            </div>
          )}

          <button 
            onClick={handleGeneratePix}
            className="btn-primary-glow h-14 px-8 w-full text-lg shadow-lg hover:shadow-xl mt-8"
          >
            {showQR ? "Atualizar QR Code PIX" : "Gerar QR Code PIX"}
          </button>
        </div>
      </div>
    </div>
  );
}