import { useState } from "react";
import { Minus, Plus, QrCode } from "lucide-react";

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
    <div className="container mx-auto p-4 max-w-md mt-10">
      <div className="border rounded-xl shadow-lg bg-card text-card-foreground transform transition duration-300 hover:scale-[1.01]">
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="font-semibold leading-none tracking-tight text-3xl text-primary">Loja de CrÃ©ditos</h3>
          <p className="text-sm text-muted-foreground">Recarregue seus crÃ©ditos e continue remixando!</p>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-primary/10 px-4 py-2 rounded-full text-base font-medium text-primary border border-primary/20">
              1 CrÃ©dito = R$ 0,50
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
            
            <div className="text-4xl font-black text-primary animate-bounce-slow">
              {total}
            </div>
          </div>

          {showQR && (
            <div className="flex flex-col items-center space-y-4 p-6 border rounded-xl bg-muted/30 animate-in fade-in zoom-in duration-300">
              <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-primary/50">
                {/* Ãcone representando o QR Code. Substitua por uma tag <img /> ao integrar com a API do PIX */}
                <QrCode className="w-52 h-52 text-zinc-900" strokeWidth={1} />
              </div>
              <p className="text-sm text-center text-muted-foreground font-medium">
                Escaneie o QR Code acima com o app do seu banco para finalizar a compra.
              </p>
              <div className="w-full bg-background p-3 rounded-lg border text-xs text-center font-mono break-all text-muted-foreground select-all shadow-inner">
                00020101021126580014br.gov.bcb.pix0136{credits * 100}1234567890520400005303986540550.005802BR5913...
              </div>
            </div>
          )}
        </div>
        <div className="p-6 pt-0">
          <button 
            onClick={handleGeneratePix}
            className="inline-flex items-center justify-center rounded-lg text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 h-14 px-8 w-full shadow-lg hover:shadow-xl"
          >
            {showQR ? "Atualizar QR Code PIX" : "Gerar QR Code PIX"}
          </button>
        </div>
      </div>
    </div>
  );
}