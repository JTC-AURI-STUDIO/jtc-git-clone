import { GitBranch, Menu, Coins } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface AppHeaderProps {
  credits: number;
}

const AppHeader = ({ credits }: AppHeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/70 backdrop-blur-2xl border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-foreground hover:text-primary transition-colors">
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--cyan-glow))] flex items-center justify-center shadow-[0_0_15px_hsl(var(--purple-glow)/0.3)]">
              <GitBranch size={18} className="text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-foreground text-sm">JTC GitClone</span>
          </Link>
        </div>
        <Link to="/credits" className="flex items-center gap-1.5 bg-secondary/80 backdrop-blur-sm px-3.5 py-2 rounded-full border border-border/50 hover:border-primary/30 transition-all">
          <Coins size={16} className="text-[hsl(var(--warning))]" />
          <span className="text-foreground text-sm font-semibold">{credits}</span>
        </Link>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
            <motion.div
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute top-14 left-0 w-64 bg-card/95 backdrop-blur-2xl border border-border/50 rounded-r-2xl shadow-2xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="space-y-1">
                <Link to="/dashboard" className="block px-3 py-2.5 rounded-xl text-foreground hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setMenuOpen(false)}>
                  🔀 Novo Remix
                </Link>
                <Link to="/credits" className="block px-3 py-2.5 rounded-xl text-foreground hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setMenuOpen(false)}>
                  🛒 Loja de Créditos
                </Link>
                <Link to="/history" className="block px-3 py-2.5 rounded-xl text-foreground hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setMenuOpen(false)}>
                  📋 Histórico de Pagamentos
                </Link>
                <Link to="/profile" className="block px-3 py-2.5 rounded-xl text-foreground hover:bg-primary/10 hover:text-primary transition-all" onClick={() => setMenuOpen(false)}>
                  👤 Perfil
                </Link>
                <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all">
                  🚪 Sair
                </button>
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppHeader;
