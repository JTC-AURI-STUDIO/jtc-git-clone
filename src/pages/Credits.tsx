import { useState, useEffect } from "react";
import { ShoppingCart, Minus, Plus, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import SpaceBackground from "@/components/SpaceBackground";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const PRICE_PER_CREDIT = 0.5;
const QUICK_OPTIONS = [5, 10, 25, 50, 100];

const Credits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [credits, setCredits] = useState(0);
  const [quantity, setQuantity] = useState(10);

  useEffect(() => {
    if (user) loadCredits();
  }, [user]);

  const loadCredits = async () => {
    const { data } = await supabase.from("credits").select("balance").eq("user_id", user!.id).single();
    if (data) setCredits(data.balance);
  };

  const total = (quantity * PRICE_PER_CREDIT).toFixed(2).replace(".", ",");

  const handleBuy = () => {
    navigate(`/payment?quantity=${quantity}`);
  };

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <AppHeader credits={credits} />

      <main className="pt-20 px-4 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-foreground font-bold text-xl mb-1">Loja de Créditos</h1>
          <p className="text-muted-foreground text-sm mb-6">Adquira créditos para utilizar nos seus remixes.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <ShoppingCart size={20} className="text-primary" />
              </div>
              <h2 className="text-foreground font-bold">Comprar Créditos</h2>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full">
              <Coins size={14} className="text-[hsl(var(--warning))]" />
              <span className="text-foreground text-sm font-semibold">{credits}</span>
            </div>
          </div>

          {/* Price card */}
          <div className="bg-secondary/50 border border-border rounded-xl p-5 text-center">
            <p className="text-muted-foreground text-sm mb-1">Preço por crédito</p>
            <p className="text-foreground text-3xl font-bold">R$ 0,50</p>
            <p className="text-muted-foreground text-xs mt-1">1 crédito = 1 remix</p>
          </div>

          {/* Quantity selector */}
          <div>
            <label className="block text-primary text-sm mb-3 font-medium">Quantidade de créditos</label>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input-dark flex-1 text-center text-lg font-bold"
                min={1}
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-border transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="flex gap-2">
              {QUICK_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setQuantity(n)}
                  className={`flex-1 py-1.5 rounded-full text-sm transition-all duration-300 border ${
                    quantity === n
                      ? "border-primary text-primary bg-primary/10 shadow-[0_0_10px_hsl(var(--purple-glow)/0.15)]"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-secondary/50 border border-border rounded-xl p-4 flex items-center justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground text-2xl font-bold">R$ {total}</span>
          </div>

          {/* Buy button */}
          <button onClick={handleBuy} className="btn-primary-glow w-full flex items-center justify-center gap-2">
            <ShoppingCart size={18} />
            Comprar {quantity} créditos
          </button>
        </motion.div>

        <footer className="text-center text-muted-foreground text-xs py-6">
          <p>
            Sistema desenvolvido por <span className="text-foreground font-medium">Jardiel De Sousa Lopes</span> — Criador da{" "}
            <span className="text-primary">JTC</span>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Credits;
