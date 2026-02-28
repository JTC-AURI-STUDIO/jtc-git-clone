import { useState } from "react";
import { Minus, Plus, QrCode, CreditCard, DollarSign } from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-bold text-4xl text-primary flex items-center justify-center gap-3"
          >
            <CreditCard size={36} /> Loja de Créditos
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-muted-foreground mt-2 text-lg"
          >
            Recarregue seus créditos e continue criando seus remixes sem interrupções.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="space-y-6">
            <div>
              <p className="font-semibold text-lg flex items-center gap-2 text-primary"><DollarSign className="w-5 h-5" /> Valor por Crédito</p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary px-4 py-2 rounded-lg text-base font-medium border border-primary/30 shadow-md mt-2"
              >
                1 Crédito = R$ 0,50
              </motion.div>
            </div>
            
            <div>
              <p className="font-semibold text-lg flex items-center gap-2 text-primary"><span className="font-base">🔢</span> Quantidade</p>
              <div className="flex items-center space-x-4 mt-2 justify-center">
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={handleDecrease}
                  className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-gradient-to-br from-background/80 to-background/60 hover:from-background hover:to-background h-12 w-12 text-primary text-xl shadow-lg hover:shadow-xl"
                >
                  <Minus className="h-5 w-5" />
                </motion.button>
                <motion.div
                  key={credits} // Key para forçar a animação na mudança de credits
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="text-5xl font-extrabold w-20 text-center text-foreground drop-shadow-lg"
                >
                  {credits}
                </motion.div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.1 }}
                  onClick={handleIncrease}
                  className="inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-gradient-to-br from-background/80 to-background/60 hover:from-background hover:to-background h-12 w-12 text-primary text-xl shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
            
            <div>
              <p className="font-semibold text-lg flex items-center gap-2 text-primary"><span className="font-base">🧾</span> Total</p>
              <motion.div
                key={total} // Key para forçar a animação na mudança de total
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.2 }}
                className="text-4xl font-black text-primary animate-pulse-slow drop-shadow-md text-center mt-2"
              >
                {total}
              </motion.div>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={handleGeneratePix}
            className="btn-primary-glow h-14 px-8 w-full text-lg shadow-lg hover:shadow-xl mt-8 flex items-center justify-center"
          >
            <QrCode className="h-6 w-6 mr-3" /> Comprar Créditos
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
