import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const { source_repo, dest_repo, github_token, same_account, dest_token } = await req.json();

    // Validate inputs
    const source = parseGitHubUrl(source_repo);
    const dest = parseGitHubUrl(dest_repo);

    if (!source) throw new Error("URL do repositório de origem inválida");
    if (!dest) throw new Error("URL do repositório de destino inválida");
    if (!github_token) throw new Error("Token GitHub é obrigatório");

    // Check credits
    const { data: creditsData } = await supabase
      .from("credits")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (!creditsData || creditsData.balance <= 0) {
      return new Response(
        JSON.stringify({ error: "Sem créditos disponíveis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create remix record as processing
    const { data: remix, error: remixError } = await supabase
      .from("remixes")
      .insert({
        user_id: userId,
        source_repo,
        destination_repo: dest_repo,
        status: "processing",
      })
      .select()
      .single();

    if (remixError) throw new Error("Erro ao criar registro do remix");

    try {
      // Step 1: Get all files from source repo (get default branch tree)
      const sourceHeaders = {
        Authorization: `token ${github_token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "JTC-RemixHub",
      };

      // Get source repo info
      const repoInfoRes = await fetch(`https://api.github.com/repos/${source.owner}/${source.repo}`, {
        headers: sourceHeaders,
      });
      
      if (!repoInfoRes.ok) {
        const errBody = await repoInfoRes.text();
        throw new Error(`Erro ao acessar repo origem [${repoInfoRes.status}]: ${errBody}`);
      }

      const repoInfo = await repoInfoRes.json();
      const defaultBranch = repoInfo.default_branch || "main";

      // Get the tree recursively
      const treeRes = await fetch(
        `https://api.github.com/repos/${source.owner}/${source.repo}/git/trees/${defaultBranch}?recursive=1`,
        { headers: sourceHeaders }
      );

      if (!treeRes.ok) {
        const errBody = await treeRes.text();
        throw new Error(`Erro ao obter árvore [${treeRes.status}]: ${errBody}`);
      }

      const treeData = await treeRes.json();

      // Get blobs content
      const destTokenToUse = same_account ? github_token : (dest_token || github_token);
      const destHeaders = {
        Authorization: `token ${destTokenToUse}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "JTC-RemixHub",
      };

      // Check if dest repo exists, if not create it
      const destRepoCheck = await fetch(`https://api.github.com/repos/${dest.owner}/${dest.repo}`, {
        headers: destHeaders,
      });

      if (destRepoCheck.status === 404) {
        // Create the destination repo
        const createRepoRes = await fetch(`https://api.github.com/user/repos`, {
          method: "POST",
          headers: { ...destHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: dest.repo,
            private: false,
            auto_init: true,
          }),
        });

        if (!createRepoRes.ok) {
          const errBody = await createRepoRes.text();
          throw new Error(`Erro ao criar repo destino [${createRepoRes.status}]: ${errBody}`);
        }

        // Wait a moment for GitHub to init the repo
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        await destRepoCheck.text();
      }

      // Get blobs for each file and create them in destination
      const blobs: Array<{ path: string; mode: string; type: string; sha: string }> = [];

      for (const item of treeData.tree) {
        if (item.type !== "blob") continue;

        // Get blob content from source
        const blobRes = await fetch(item.url, { headers: sourceHeaders });
        if (!blobRes.ok) {
          await blobRes.text();
          continue;
        }
        const blobData = await blobRes.json();

        // Create blob in destination
        const createBlobRes = await fetch(
          `https://api.github.com/repos/${dest.owner}/${dest.repo}/git/blobs`,
          {
            method: "POST",
            headers: { ...destHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              content: blobData.content,
              encoding: "base64",
            }),
          }
        );

        if (!createBlobRes.ok) {
          await createBlobRes.text();
          continue;
        }

        const newBlob = await createBlobRes.json();
        blobs.push({
          path: item.path,
          mode: item.mode,
          type: "blob",
          sha: newBlob.sha,
        });
      }

      // Create tree in destination
      const createTreeRes = await fetch(
        `https://api.github.com/repos/${dest.owner}/${dest.repo}/git/trees`,
        {
          method: "POST",
          headers: { ...destHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ tree: blobs }),
        }
      );

      if (!createTreeRes.ok) {
        const errBody = await createTreeRes.text();
        throw new Error(`Erro ao criar árvore [${createTreeRes.status}]: ${errBody}`);
      }

      const newTree = await createTreeRes.json();

      // Create commit
      const createCommitRes = await fetch(
        `https://api.github.com/repos/${dest.owner}/${dest.repo}/git/commits`,
        {
          method: "POST",
          headers: { ...destHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Remix from ${source.owner}/${source.repo} via JTC RemixHub`,
            tree: newTree.sha,
          }),
        }
      );

      if (!createCommitRes.ok) {
        const errBody = await createCommitRes.text();
        throw new Error(`Erro ao criar commit [${createCommitRes.status}]: ${errBody}`);
      }

      const newCommit = await createCommitRes.json();

      // Update default branch ref
      const updateRefRes = await fetch(
        `https://api.github.com/repos/${dest.owner}/${dest.repo}/git/refs/heads/main`,
        {
          method: "PATCH",
          headers: { ...destHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            sha: newCommit.sha,
            force: true,
          }),
        }
      );

      if (!updateRefRes.ok) {
        // Try with "master" branch
        const updateMasterRes = await fetch(
          `https://api.github.com/repos/${dest.owner}/${dest.repo}/git/refs/heads/master`,
          {
            method: "PATCH",
            headers: { ...destHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
              sha: newCommit.sha,
              force: true,
            }),
          }
        );
        if (!updateMasterRes.ok) {
          const errBody = await updateMasterRes.text();
          throw new Error(`Erro ao atualizar branch [${updateMasterRes.status}]: ${errBody}`);
        }
        await updateMasterRes.text();
      } else {
        await updateRefRes.text();
      }

      // Success: update remix status and deduct credit
      await supabase
        .from("remixes")
        .update({ status: "success" })
        .eq("id", remix.id);

      const newBalance = creditsData.balance - 1;
      await supabase
        .from("credits")
        .update({ balance: newBalance })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, remix_id: remix.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (remixErr) {
      // Update remix as error
      await supabase
        .from("remixes")
        .update({ status: "error" })
        .eq("id", remix.id);

      throw remixErr;
    }
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
