import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GitBranch, ArrowRight } from "lucide-react";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";

const Auth = () => {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (tab === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Conta criada com sucesso!");
          navigate("/dashboard");
        } else {
          toast.success("Conta criada! Agora faça login.");
          setTab("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SpaceBackground />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center mb-4">
            <GitBranch size={28} className="text-primary-foreground" />
          </div>
          <h1 className="font-mono font-bold text-2xl text-foreground">JTC RemixHub</h1>
          <p className="text-muted-foreground mt-1 text-sm">Remix projetos GitHub de forma ilimitada</p>
        </div>

        <div className="glass-card p-6">
          <div className="tab-selector mb-6">
            <button
              className={tab === "login" ? "tab-selector-item-active" : "tab-selector-item"}
              onClick={() => setTab("login")}
            >
              Entrar
            </button>
            <button
              className={tab === "register" ? "tab-selector-item-active" : "tab-selector-item"}
              onClick={() => setTab("register")}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "register" && (
              <div>
                <label className="block text-primary text-sm mb-1.5">Nome</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-dark w-full"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-primary text-sm mb-1.5">Email</label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>
            <div>
              <label className="block text-primary text-sm mb-1.5">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-dark w-full"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary-glow w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowRight size={18} />
              {tab === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
