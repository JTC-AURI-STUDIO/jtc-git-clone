import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Github, // Importado para ícone do GitHub
  CreditCard, // Importado para ícone de créditos
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SpaceBackground from "@/components/SpaceBackground";

interface Remix {
  id: string;
  source_repo: string;
  destination_repo: string;
  status: string;
  created_at: string;
}

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
  const [recentRemixes, setRecentRemixes] = useState<Remix[]>([]);

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

    const [creditsRes, remixesRes] = await Promise.all([
      supabase.from("credits").select("balance").eq("user_id", user.id).single(),
      supabase
        .from("remixes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (creditsRes.data) setCredits(creditsRes.data.balance);
    if (remixesRes.data) setRecentRemixes(remixesRes.data as Remix[]);
  };

  const handleRemix = async () => {
    if (!sourceRepo || !destRepo || !githubToken) {
      toast.error("Preencha todos os campos obrigatórios.");
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

  const statusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span className="status-badge-success">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Sucesso
          </span>
        );
      case "processing":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" /> Processando
          </Badge>
        );
      default:
        return (
          <span className="status-badge-error">
            <XCircle className="w-3 h-3 mr-1" /> Erro
          </span>
        );
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <AppHeader credits={credits} />

      <main className="pt-20 px-4 max-w-3xl mx-auto space-y-8">
        {/* Seção de Créditos e Ações Rápidas */}
        <div className="grid-cols-1 md:grid-cols-2 gap-4 flex-col md:flex-row flex">
          <Card className="glass-card flex-1 border-0">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center justify-between">
                Seus Créditos
                <CreditCard className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <p className="text-5xl font-extrabold text-primary mb-2">{credits}</p>
              <p className="text-sm text-center text-muted-foreground">Créditos disponíveis para remixes.</p>
              <Button
                variant="outline"
                className="mt-4 btn-primary-outline"
                onClick={() => navigate("/credits")}
              >
                Comprar mais créditos
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-card flex-1 border-0">
            <CardHeader>
              <CardTitle className="text-foreground text-base flex items-center justify-between">
                Ações Rápidas
                <Github className="h-5 w-5 text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 space-y-3">
              <Button
                  variant="outline"
                  className="w-full btn-primary-outline"
                  onClick={() => window.open("https://github.com/settings/tokens", "_blank")}
              >
                Gerar Token GitHub Pessoal
              </Button>
              <Button
                  variant="outline"
                  className="w-full btn-primary-outline"
                  onClick={() => navigate("/history")}
              >
                Ver Histórico de Pagamentos
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Remix Form */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <GitBranch className="h-5 w-5 text-primary" />
              Novo Remix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-primary mb-1.5">
                Repositório de origem (URL GitHub)
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
              <label className="block text-sm text-primary mb-1.5">
                Repositório de destino (URL GitHub)
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

            <div>
              <label className="block text-sm text-primary mb-1.5">
                Token GitHub (origem)
              </label>
              <input
                type="password"
                placeholder="ghp_xxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                className="input-dark w-full"
                disabled={remixing}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="same-account"
                checked={sameAccount}
                onChange={(e) => setSameAccount(e.target.checked)}
                className="accent-primary"
                disabled={remixing}
              />
              <label htmlFor="same-account" className="text-sm text-muted-foreground">
                Mesma conta GitHub para origem e destino
              </label>
            </div>

            {!sameAccount && (
              <div>
                <label className="block text-sm text-primary mb-1.5">
                  Token GitHub (destino)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxx"
                  value={destToken}
                  onChange={(e) => setDestToken(e.target.value)}
                  className="input-dark w-full"
                  disabled={remixing}
                />
              </div>
            )}

            <button
              onClick={handleRemix}
              disabled={remixing || !sourceRepo || !destRepo || !githubToken}
              className="btn-primary-glow w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {remixing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Remixando...
                </>
              ) : (
                <>
                  <GitBranch className="h-5 w-5" />
                  Iniciar Remix (1 crédito)
                </>
              )}
            </button>
          </CardContent>
        </Card>

        {/* Recent Remixes */}
        {recentRemixes.length > 0 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="text-foreground text-base">Remixes Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRemixes.map((remix) => (
                  <div
                    key={remix.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-3 rounded-xl bg-secondary/30 border border-border/50"
                  >
                    <div className="space-y-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {remix.source_repo.replace("https://github.com/", "")}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        → {remix.destination_repo.replace("https://github.com/", "")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(remix.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(remix.status)}
                      {remix.status === "success" && (
                        <a
                          href={remix.destination_repo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
