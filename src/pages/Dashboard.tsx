import { useState, useEffect, useRef } from "react";
import { GitBranch, ArrowDownUp, Eye, EyeOff, ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle2, XCircle, Search, Download, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import SpaceBackground from "@/components/SpaceBackground";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const PROGRESS_STEPS = [
  "Conectando ao GitHub...",
  "Lendo arquivos do repositório origem...",
  "Verificando repositório de destino...",
  "Limpando repositório de destino...",
  "Copiando arquivos...",
  "Criando nova estrutura...",
  "Finalizando remix...",
  "Remix concluído!",
];

const MAX_REMIXES_PER_HOUR = 3;

const Dashboard = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [sourceRepo, setSourceRepo] = useState("");
  const [destRepo, setDestRepo] = useState("");
  const [sameAccount, setSameAccount] = useState(true);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [remixes, setRemixes] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  // Rate limit
  const [remixesUsed, setRemixesUsed] = useState(0);
  const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState("");

  // Progress state
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState<"running" | "success" | "error">("running");
  const [progressError, setProgressError] = useState("");
  const [filesCopied, setFilesCopied] = useState(0);
  const progressInterval = useRef<number | null>(null);

  useEffect(() => {
    if (user) {
      loadCredits();
      loadRemixes();
      loadRemixesUsedThisHour();
    }
  }, [user]);

  // Countdown timer for next remix refresh
  useEffect(() => {
    if (!nextRefresh || remixesUsed < MAX_REMIXES_PER_HOUR) {
      setRefreshCountdown("");
      return;
    }
    const interval = setInterval(() => {
      const now = new Date();
      const diff = nextRefresh.getTime() - now.getTime();
      if (diff <= 0) {
        setRefreshCountdown("");
        loadRemixesUsedThisHour();
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRefreshCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [nextRefresh, remixesUsed]);

  const loadCredits = async () => {
    const { data } = await supabase.from("credits").select("balance").eq("user_id", user!.id).single();
    if (data) setCredits(data.balance);
  };

  const loadRemixes = async () => {
    const { data } = await supabase.from("remixes").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    if (data) setRemixes(data);
  };

  const loadRemixesUsedThisHour = async () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("remixes")
      .select("created_at")
      .eq("user_id", user!.id)
      .gte("created_at", oneHourAgo)
      .order("created_at", { ascending: true });

    const count = data?.length || 0;
    setRemixesUsed(count);

    if (count >= MAX_REMIXES_PER_HOUR && data && data.length > 0) {
      // Next refresh = oldest remix in the hour window + 1 hour
      const oldest = new Date(data[0].created_at);
      setNextRefresh(new Date(oldest.getTime() + 60 * 60 * 1000));
    } else {
      setNextRefresh(null);
    }
  };

  const remixesRemaining = Math.max(0, MAX_REMIXES_PER_HOUR - remixesUsed);

  const simulateProgress = () => {
    let step = 0;
    let percent = 0;
    setProgressStep(0);
    setProgressPercent(0);
    const stepDurations = [2000, 3000, 2000, 3000, 8000, 3000, 2000];
    let totalElapsed = 0;
    progressInterval.current = window.setInterval(() => {
      totalElapsed += 200;
      let accumulated = 0;
      let newStep = 0;
      for (let i = 0; i < stepDurations.length; i++) {
        accumulated += stepDurations[i];
        if (totalElapsed < accumulated) { newStep = i; break; }
        newStep = i + 1;
      }
      if (newStep > 6) newStep = 6;
      step = newStep;
      setProgressStep(step);
      const maxPercent = 90;
      const stepPercent = (step / 7) * maxPercent;
      const withinStepPercent = stepDurations[step]
        ? ((totalElapsed - stepDurations.slice(0, step).reduce((a, b) => a + b, 0)) / stepDurations[step]) * (maxPercent / 7)
        : 0;
      percent = Math.min(maxPercent, stepPercent + withinStepPercent);
      setProgressPercent(Math.round(percent));
    }, 200);
  };

  const stopProgress = (success: boolean) => {
    if (progressInterval.current) { clearInterval(progressInterval.current); progressInterval.current = null; }
    if (success) { setProgressStep(7); setProgressPercent(100); setProgressStatus("success"); }
    else { setProgressStatus("error"); }
  };

  const handleRemix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (credits <= 0) { toast.error("Sem créditos! Compre mais na loja."); return; }
    if (remixesRemaining <= 0) { toast.error("Limite de remixes por hora atingido! Aguarde."); return; }
    if (!token.trim()) { toast.error("Informe seu token GitHub."); return; }

    setLoading(true);
    setShowProgress(true);
    setProgressStatus("running");
    setProgressError("");
    setFilesCopied(0);
    simulateProgress();

    try {
      const { data, error } = await supabase.functions.invoke("create-remix", {
        body: { source_repo: sourceRepo, dest_repo: destRepo, github_token: token, same_account: sameAccount },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      stopProgress(true);
      setFilesCopied(data.files_copied || 0);
      toast.success("Remix criado com sucesso!");
      loadCredits();
      loadRemixes();
      loadRemixesUsedThisHour();
      setSourceRepo("");
      setDestRepo("");
    } catch (error: any) {
      stopProgress(false);
      setProgressError(error.message || "Erro ao criar remix.");
      toast.error(error.message || "Erro ao criar remix.");
      loadRemixes();
      loadRemixesUsedThisHour();
    } finally {
      setLoading(false);
    }
  };

  const closeProgress = () => {
    setShowProgress(false);
    setProgressStep(0);
    setProgressPercent(0);
    setProgressStatus("running");
    setProgressError("");
  };

  const filteredRemixes = remixes.filter((r) => {
    const matchSearch = r.source_repo.toLowerCase().includes(searchFilter.toLowerCase()) || r.destination_repo.toLowerCase().includes(searchFilter.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusIcon = (status: string) => {
    switch (status) {
      case "success": return <CheckCircle2 size={18} className="text-[hsl(var(--success))]" />;
      case "error": return <XCircle size={18} className="text-destructive" />;
      default: return <Clock size={18} className="text-[hsl(var(--warning))]" />;
    }
  };

  return (
    <div className="min-h-screen pb-8">
      <SpaceBackground />
      <AppHeader credits={credits} />

      <main className="pt-20 px-4 max-w-lg mx-auto space-y-5">
        {/* Remix Slots */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-primary" />
              <span className="text-foreground font-semibold text-sm">Remixes Disponíveis</span>
            </div>
            {refreshCountdown && (
              <span className="text-xs font-mono text-[hsl(var(--warning))] pulse-soft">
                ⏳ {refreshCountdown}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {Array.from({ length: MAX_REMIXES_PER_HOUR }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2.5 rounded-full transition-all duration-500 ${
                  i < remixesRemaining
                    ? "bg-gradient-to-r from-primary to-[hsl(var(--cyan-glow))]"
                    : "bg-secondary"
                }`}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs mt-2">
            {remixesRemaining > 0
              ? `${remixesRemaining} de ${MAX_REMIXES_PER_HOUR} remixes disponíveis nesta hora`
              : "Limite atingido! Aguarde o próximo ciclo."}
          </p>
        </motion.div>

        {/* Credits Warning */}
        {credits <= 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Link to="/credits" className="glass-card p-4 flex items-center gap-3 cursor-pointer block gradient-border">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--warning)/0.15)] flex items-center justify-center">
                <AlertTriangle size={20} className="text-[hsl(var(--warning))]" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-semibold text-sm">Sem créditos!</p>
                <p className="text-muted-foreground text-xs">Clique para recarregar na loja</p>
              </div>
            </Link>
          </motion.div>
        )}

        {/* Progress Panel */}
        <AnimatePresence>
          {showProgress && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="glass-card p-6 space-y-4 gradient-border"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  progressStatus === "success" ? "bg-[hsl(var(--success)/0.15)]" : progressStatus === "error" ? "bg-destructive/15" : "bg-primary/15"
                }`}>
                  {progressStatus === "running" ? (
                    <Loader2 size={20} className="text-primary animate-spin" />
                  ) : progressStatus === "success" ? (
                    <CheckCircle2 size={20} className="text-[hsl(var(--success))]" />
                  ) : (
                    <XCircle size={20} className="text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-foreground font-bold text-sm">
                    {progressStatus === "success" ? "Remix Concluído! 🎉" : progressStatus === "error" ? "Erro no Remix" : "Processando Remix..."}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {progressStatus === "success"
                      ? `${filesCopied} arquivos copiados com sucesso`
                      : progressStatus === "error"
                      ? progressError
                      : PROGRESS_STEPS[progressStep] || "Iniciando..."}
                  </p>
                </div>
                <span className={`text-sm font-bold font-mono ${
                  progressStatus === "success" ? "text-[hsl(var(--success))]" : progressStatus === "error" ? "text-destructive" : "text-primary"
                }`}>
                  {progressPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    progressStatus === "success"
                      ? "bg-[hsl(var(--success))]"
                      : progressStatus === "error"
                      ? "bg-destructive"
                      : "bg-gradient-to-r from-primary via-[hsl(var(--pink-glow))] to-[hsl(var(--cyan-glow))]"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Step Details */}
              <div className="space-y-2">
                {PROGRESS_STEPS.slice(0, progressStep + 1).map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    {i < progressStep ? (
                      <CheckCircle2 size={14} className="text-[hsl(var(--success))] flex-shrink-0" />
                    ) : i === progressStep && progressStatus === "running" ? (
                      <Loader2 size={14} className="text-primary animate-spin flex-shrink-0" />
                    ) : i === progressStep && progressStatus === "error" ? (
                      <XCircle size={14} className="text-destructive flex-shrink-0" />
                    ) : (
                      <CheckCircle2 size={14} className="text-[hsl(var(--success))] flex-shrink-0" />
                    )}
                    <span className={`text-xs ${i <= progressStep ? "text-foreground" : "text-muted-foreground"}`}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Source/Dest info */}
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Origem:</span>
                  <span className="text-foreground font-mono truncate">{sourceRepo.replace("https://github.com/", "") || "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Destino:</span>
                  <span className="text-foreground font-mono truncate">{destRepo.replace("https://github.com/", "") || "—"}</span>
                </div>
              </div>

              {(progressStatus === "success" || progressStatus === "error") && (
                <button onClick={closeProgress} className="text-primary text-sm underline w-full text-center">
                  Fechar
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* New Remix Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <GitBranch size={20} className="text-primary" />
            </div>
            <h2 className="text-foreground font-bold text-lg">Novo Remix</h2>
          </div>

          <form onSubmit={handleRemix} className="space-y-4">
            <div>
              <label className="block text-primary text-sm mb-1.5 font-medium">Repositório Mãe (Origem)</label>
              <input
                type="url"
                placeholder="https://github.com/usuario/repositorio"
                value={sourceRepo}
                onChange={(e) => setSourceRepo(e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>

            <div className="flex justify-center">
              <motion.div
                className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center"
                animate={{ rotate: loading ? 360 : 0 }}
                transition={{ duration: 2, repeat: loading ? Infinity : 0, ease: "linear" }}
              >
                <ArrowDownUp size={18} className="text-primary" />
              </motion.div>
            </div>

            <div>
              <label className="block text-primary text-sm mb-1.5 font-medium">Repositório Filha (Destino)</label>
              <input
                type="url"
                placeholder="https://github.com/usuario/repositorio"
                value={destRepo}
                onChange={(e) => setDestRepo(e.target.value)}
                className="input-dark w-full"
                required
              />
            </div>

            <div className="flex items-center justify-between bg-input rounded-xl px-4 py-3.5">
              <span className="text-foreground text-sm">Mesma conta GitHub?</span>
              <button
                type="button"
                onClick={() => setSameAccount(!sameAccount)}
                className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-0.5 ${sameAccount ? "bg-primary shadow-[0_0_12px_hsl(var(--purple-glow)/0.4)]" : "bg-border"}`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-foreground"
                  animate={{ x: sameAccount ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            <div>
              <label className="block text-primary text-sm mb-1.5 font-medium">Token GitHub (Origem)</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  placeholder="ghp_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-dark w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Token Help */}
            <button
              type="button"
              onClick={() => setShowTokenHelp(!showTokenHelp)}
              className="flex items-center gap-1 text-primary text-sm"
            >
              {showTokenHelp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Como criar o token?
            </button>

            <AnimatePresence>
              {showTokenHelp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="glass-card p-5 space-y-4">
                    {[
                      { step: 1, title: "Acesse a página de tokens", desc: "github.com/settings/tokens/new" },
                      { step: 2, title: "Escolha o tipo de token", desc: "Clique em Generate new token (classic)" },
                      { step: 3, title: "Dê um nome ao token", desc: "No campo Note, coloque algo como jtc-gitremix" },
                      { step: 4, title: "Marque a permissão 'repo'", desc: "Na lista de scopes, marque ☑ repo (Full control)" },
                      { step: 5, title: "Gere e copie o token", desc: "Clique em Generate token e copie ghp_..." },
                    ].map((item) => (
                      <div key={item.step} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-[hsl(var(--cyan-glow))] flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-foreground font-bold text-sm">{item.step}</span>
                        </div>
                        <div>
                          <p className="text-foreground font-semibold text-sm">{item.title}</p>
                          <p className="text-muted-foreground text-xs font-mono">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                    <div className="bg-[hsl(var(--warning)/0.1)] border border-[hsl(var(--warning)/0.3)] rounded-xl p-3">
                      <p className="text-[hsl(var(--warning))] text-xs">⚠️ O token só aparece uma vez! Copie e guarde em local seguro.</p>
                    </div>
                    <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" className="text-primary text-sm inline-flex items-center gap-1 hover:underline">
                      Criar token agora ↗
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || remixesRemaining <= 0 || credits <= 0}
              className="btn-primary-glow w-full flex items-center justify-center gap-2 mt-4"
            >
              <GitBranch size={18} />
              {loading ? "Processando..." : remixesRemaining <= 0 ? `Aguarde ${refreshCountdown || "..."}` : "Iniciar Remix"}
            </button>
          </form>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Clock size={20} className="text-primary" />
              </div>
              <h2 className="text-foreground font-bold">Histórico</h2>
              <span className="text-muted-foreground text-sm">({remixes.length})</span>
            </div>
            <button className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors">
              <Download size={14} />
              CSV
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar repositório..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="input-dark w-full pl-9 py-2.5 text-sm"
            />
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {["all", "success", "error", "processing"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-300 ${
                  statusFilter === s
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_10px_hsl(var(--purple-glow)/0.15)]"
                    : "text-muted-foreground border border-border hover:border-primary/20"
                }`}
              >
                {s === "all" ? "Todos" : s === "success" ? "Sucesso" : s === "error" ? "Erro" : "Processando"}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredRemixes.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Nenhum remix encontrado.</p>
            ) : (
              filteredRemixes.map((remix, idx) => (
                <motion.div
                  key={remix.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-t border-border pt-3"
                >
                  <div className="flex items-start gap-3">
                    {statusIcon(remix.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-mono truncate">{remix.source_repo.replace("https://github.com/", "")}</p>
                      <p className="text-muted-foreground text-xs">→ {remix.destination_repo.replace("https://github.com/", "")}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {new Date(remix.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        <footer className="text-center text-muted-foreground text-xs py-4">
          <p>
            Sistema desenvolvido por <span className="text-foreground font-medium">Jardiel De Sousa Lopes</span> — Criador da{" "}
            <span className="text-primary">JTC</span>
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
