import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  GitBranch,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SpaceBackground from "@/components/SpaceBackground";


const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [credits, setCredits] = useState(0);
  const [sourceRepo, setSourceRepo] = useState("");
  const [destRepo, setDestRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [destToken, setDestToken] = useState("");
  const [sameAccount, setSameAccount] = useState(true);
  const [remixing, setRemixing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    void loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    if (!user) return;

    const [creditsRes] = await Promise.all([
      supabase.from("credits").select("balance").eq("user_id", user.id).single(),
    ]);

    if (creditsRes.data) setCredits(creditsRes.data.balance);
  };

  const handleRemix = async () => {
    if (!sourceRepo || !destRepo || !githubToken) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!sameAccount && !destToken) {
      toast.error("O token do repositório de destino é obrigatório.");
      return;
    }

    if (credits <= 0) {
      toast.error("Você não tem créditos. Compre créditos para continuar.");
      navigate("/credits");
      return;
    }

    try {
      setRemixing(true);
      const { data, error } = await supabase.functions.invoke("create-remix", {
        body: {
          source_repo: sourceRepo,
          dest_repo: destRepo,
          github_token: githubToken,
          same_account: sameAccount,
          dest_token: sameAccount ? undefined : destToken,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erro ao criar remix.");
      }

      toast.success(`Remix concluído! ${data.files_copied} arquivos copiados.`);
      setSourceRepo("");
      setDestRepo("");
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar remix.");
    } finally {
      setRemixing(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <AppHeader credits={credits} />

      <main className="pt-20 px-4 max-w-3xl mx-auto space-y-8">
        {/* Remix Form */}
        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex items-center gap-2 text-foreground">
              <GitBranch className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground text-base">Novo Remix</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Clone e personalize um repositório do GitHub em poucos passos.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-primary mb-1.5 font-medium flex items-center gap-1.5">
                <span className="text-base">🔗</span> Repositório de Origem
              </label>
              <input
                type="text"
                placeholder="https://github.com/user/repo"
                value={sourceRepo}
                onChange={(e) => setSourceRepo(e.target.value)}
                className="input-dark w-full"
                disabled={remixing}
              />
            </div>

            <div>
              <label className="block text-sm text-primary mb-1.5 font-medium flex items-center gap-1.5">
                <span className="text-base">🎯</span> Repositório de Destino
              </label>
              <input
                type="text"
                placeholder="https://github.com/you/new-repo"
                value={destRepo}
                onChange={(e) => setDestRepo(e.target.value)}
                className="input-dark w-full"
                disabled={remixing}
              />
            </div>

            {sameAccount ? (
              <div className="token-group">
                <label className="block text-sm text-primary mb-1.5 font-medium flex items-center gap-1.5">
                  <span className="text-base">🔐</span> Token de Acesso (Origem e Destino)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxx (Token de acesso pessoal com permissões de repo)"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  className="input-dark w-full"
                  required
                  disabled={remixing}
                />
              </div>
            ) : (
              <div className="token-group space-y-4">
                <div>
                  <label className="block text-sm text-primary mb-1.5 font-medium flex items-center gap-1.5">
                    <span className="text-base">🔐</span> Token de Acesso (Origem)
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxx (Token de acesso pessoal com permissões de repo)"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="input-dark w-full"
                    required
                    disabled={remixing}
                  />
                </div>
                <div>
                  <label className="block text-sm text-primary mb-1.5 font-medium flex items-center gap-1.5">
                    <span className="text-base">🔑</span> Token de Acesso (Destino)
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxxx (Token de acesso pessoal com permissões de repo)"
                    value={destToken}
                    onChange={(e) => setDestToken(e.target.value)}
                    className="input-dark w-full"
                    required
                    disabled={remixing}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="same-account"
                checked={sameAccount}
                onChange={(e) => setSameAccount(e.target.checked)}
                className="accent-primary"
                disabled={remixing}
              />
              <label htmlFor="same-account" className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="text-base">🔄</span> Usar a mesma conta GitHub para origem e destino
              </label>
            </div>

            <button
              onClick={handleRemix}
              disabled={remixing || !sourceRepo || !destRepo || !githubToken || (!sameAccount && !destToken)}
              className="btn-primary-glow w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {remixing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Remixando...
                </>
              ) : (
                <>
                  <span className="text-base">💳</span> Iniciar Remix (1 crédito)
                </>
              )}
            </button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
