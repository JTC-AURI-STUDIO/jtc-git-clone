import { GitBranch, Menu, Coins } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(!menuOpen)} className="text-foreground">
            <Menu size={22} />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <GitBranch size={18} className="text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-foreground text-sm">JTC RemixHub</span>
          </Link>
        </div>
        <Link to="/credits" className="flex items-center gap-1.5 bg-secondary px-3 py-1.5 rounded-full">
          <Coins size={16} className="text-warning" />
          <span className="text-foreground text-sm font-medium">{credits}</span>
        </Link>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute top-14 left-0 w-64 bg-card border border-border rounded-r-xl shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1">
              <Link to="/dashboard" className="block px-3 py-2.5 rounded-lg text-foreground hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
                🔀 Novo Remix
              </Link>
              <Link to="/credits" className="block px-3 py-2.5 rounded-lg text-foreground hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
                🛒 Loja de Créditos
              </Link>
              <Link to="/profile" className="block px-3 py-2.5 rounded-lg text-foreground hover:bg-secondary transition-colors" onClick={() => setMenuOpen(false)}>
                👤 Perfil
              </Link>
              <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-destructive hover:bg-secondary transition-colors">
                🚪 Sair
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default AppHeader;
