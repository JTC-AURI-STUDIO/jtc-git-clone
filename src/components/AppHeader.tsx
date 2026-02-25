import { GitBranch, Menu, Coins, Shuffle, ShoppingCart, Receipt, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface AppHeaderProps {
  credits: number;
}

const AppHeader = ({ credits }: AppHeaderProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/70 backdrop-blur-2xl border-b border-border/50">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="text-foreground hover:text-primary transition-colors p-1">
              <Menu size={22} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-card/95 backdrop-blur-2xl border-r-border/50 p-0 flex flex-col">
            <div className="p-6 border-b border-border/50">
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--cyan-glow))] flex items-center justify-center shadow-[0_0_15px_hsl(var(--purple-glow)/0.3)]">
                    <GitBranch size={20} className="text-primary-foreground" />
                  </div>
                  <span className="font-mono font-bold text-foreground text-lg">JTC GitClone</span>
                </SheetTitle>
              </SheetHeader>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <nav className="flex flex-col space-y-1.5">
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all font-medium group"
                >
                  <Shuffle size={20} className="text-primary group-hover:scale-110 transition-transform" />
                  Novo Remix
                </Link>
                <Link
                  to="/credits"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all font-medium group"
                >
                  <ShoppingCart size={20} className="text-[hsl(var(--cyan-glow))] group-hover:scale-110 transition-transform" />
                  Loja de Créditos
                </Link>
                <Link
                  to="/history"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all font-medium group"
                >
                  <Receipt size={20} className="text-[hsl(var(--pink-glow))] group-hover:scale-110 transition-transform" />
                  Histórico de Pagamentos
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all font-medium group"
                >
                  <User size={20} className="text-[hsl(var(--warning))] group-hover:scale-110 transition-transform" />
                  Perfil
                </Link>
              </nav>
            </div>

            <div className="p-4 border-t border-border/50">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-destructive hover:bg-destructive/10 transition-all font-medium group"
              >
                <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                Sair da conta
              </button>
            </div>
          </SheetContent>
        </Sheet>
        
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
  );
};

export default AppHeader;
