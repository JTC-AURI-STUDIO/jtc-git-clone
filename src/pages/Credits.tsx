import { useState } from "react";
import { Minus, Plus, QrCode } from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";
import { useNavigate } from "react-router-dom";

export default function Credits() {
  const [credits, setCredits] = useState(1);
  const navigate = useNavigate();
  
  const handleDecrease = () => {
    if (credits > 1) {
      setCredits(credits - 1);
    }
  };

  const handleIncrease = () => {
    setCredits(credits + 1);
  };

  const handleGeneratePix = () => {
    navigate(`/payment?credits=${credits}`);
  };

  const total = (credits * 0.50).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
                className="inline-flex items-center justify- Crores rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-muted hover:text-accent-foreground h-14 w-14 text-primary text-xl shadow-sm hover:shadow-md"
              >
                <Plus className="h-6 w-6" />
              </button>
            </div>
            
            <div className="text-5xl font-black text-primary animate-bounce-slow">
              {total}
            </div>
          </div>

          <button 
            onClick={handleGeneratePix}
            className="btn-primary-glow h-14 px-8 w-full text-lg shadow-lg hover:shadow-xl mt-8"
          >
            Comprar Créditos
          </button>
        </div>
      </div>
    </div>
  );
}