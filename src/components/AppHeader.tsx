import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, LayoutDashboard, CreditCard, History, User2, AlignJustify } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

interface AppHeaderProps {
  credits: number;
}

const AppHeader = ({ credits }: AppHeaderProps) => {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/auth");
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: CreditCard, label: "Comprar CrÃ©ditos", path: "/credits" },
    { icon: History, label: "HistÃ³rico de Pagamentos", path: "/history" },
    { icon: User2, label: "Perfil", path: "/profile" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-10 p-4 border-b border-primary/20 bg-background/50 backdrop-blur-md">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/dashboard" className="font-mono text-xl font-bold text-primary">
          JTC RemixHub
        </Link>

        <div className="flex items-center space-x-4">
          <div className="text-sm font-medium text-foreground">
            CrÃ©ditos: <span className="text-primary font-bold text-lg">{credits}</span>
          </div>

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden focus-visible:ring-offset-0">
                <AlignJustify className="h-6 w-6 text-primary" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] pr-0 pt-10">
              <SheetHeader className="px-4 text-left">
                <SheetTitle className="text-2xl text-primary font-bold">NavegaÃ§Ã£o</SheetTitle>
                <SheetDescription>Explore as funcionalidades da plataforma.</SheetDescription>
              </SheetHeader>
              <nav className="mt-8 flex flex-col space-y-2 px-4">
                {navItems.map((item) => (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className="justify-start text-base py-6 focus-visible:ring-offset-0"
                    asChild
                    onClick={() => setSheetOpen(false)}
                  >
                    <Link to={item.path}>
                      <item.icon className="mr-3 h-5 w-5 text-primary" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  className="justify-start text-base py-6 text-red-500 hover:text-red-600 focus-visible:ring-offset-0"
                  onClick={() => {
                    handleLogout();
                    setSheetOpen(false);
                  }}
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sair
                </Button>
              </nav>
            </SheetContent>
          </Sheet>

          <nav className="hidden lg:flex items-center space-x-2">
            {navItems.map((item) => (
              <Button key={item.path} variant="ghost" asChild>
                <Link to={item.path}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            ))}
            <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
