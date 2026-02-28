import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Github, LogOut, Loader2, GitBranch, CreditCard, History, User, Menu } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

interface AppHeaderProps {
  credits?: number;
}

const AppHeader = ({ credits }: AppHeaderProps) => {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 transition-all duration-300">
      <div
        className="flex items-center justify-between mx-auto max-w-7xl px-4 py-2 rounded-2xl sh glass-card-border shadow-xl"
      >
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="inline-flex w-10 h-10 rounded-xl bg-primary items-center justify-center">
            <GitBranch size={20} className="text-primary-foreground" />
          </div>
          <h1 className="font-bold text-xl text-foreground font-mono">JTC RemixHub</h1>
        </div>

        {/* Credits Display */}
        {credits !== undefined && (
          <div className="hidden md:flex items-center bg-secondary/30 px-3 py-2 rounded-full border border-border/50 shadow-sm text-sm font-medium text-foreground">
            <span className="mr-2 text-primary">Créditos:</span> {credits}
          </div>
        )}

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <GitBranch className="h-4 w-4 mr-2" /> Dashboard
          </Button>
          <Button variant="ghost" onClick={() => navigate("/credits")}>
            <CreditCard className="h-4 w-4 mr-2" /> Comprar Créditos
          </Button>
          {credits !== undefined && (
            <Button variant="ghost" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 mr-2" /> Perfil
            </Button>
          )}
          <Button variant="ghost" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </Button>
        </nav>

        {/* Mobile Navigation (Sheet) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-background/95 backdrop-blur-lg">
              <SheetHeader className="mb-8">
                <SheetTitle className="text-2xl font-bold font-mono text-primary">✨ Navegação</SheetTitle>
                <p className="text-sm text-muted-foreground">Explore todas as funcionalidades da plataforma com facilidade.</p>
              </SheetHeader>
              <nav className="flex flex-col gap-4">
                {credits !== undefined && (
                  <div className="flex items-center bg-secondary/30 px-3 py-2 rounded-lg border border-border/50 text-sm font-medium text-foreground">
                    <span className="mr-2 text-primary">Créditos disponíveis:</span> {credits}
                  </div>
                )}
                <Button variant="ghost" className="justify-start text-base" onClick={() => navigate("/dashboard")}>
                  <GitBranch className="h-5 w-5 mr-3 text-primary" /> 🏠 Dashboard
                </Button>
                <Button variant="ghost" className="justify-start text-base" onClick={() => navigate("/credits")}>
                  <CreditCard className="h-5 w-5 mr-3 text-primary" /> 💳 Comprar Créditos
                </Button>
                <Button variant="ghost" className="justify-start text-base" onClick={() => navigate("/history")}>
                  <History className="h-5 w-5 mr-3 text-primary" /> 📜 Histórico de Pagamentos
                </Button>
                <Button variant="ghost" className="justify-start text-base" onClick={() => navigate("/profile")}>
                  <User className="h-5 w-5 mr-3 text-primary" /> 👤 Perfil
                </Button>
                <Button variant="ghost" className="justify-start text-base text-red-500 hover:text-red-600" onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? (
                    <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5 mr-3" />
                  )}
                  🚪 Sair
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
