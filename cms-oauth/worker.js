/**
 * Cloudflare Worker — Decap CMS GitHub OAuth (ücretsiz)
 *
 * Kurulum (bir kez):
 * 1. GitHub → Settings → Developer settings → OAuth Apps → New
 *    Homepage: https://YOUR-SITE
 *    Callback: https://ozmaksan-cms-auth.YOUR_SUBDOMAIN.workers.dev/callback
 * 2. wrangler secret put GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 * 3. wrangler deploy
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/auth") {
      const provider = "github";
      const clientId = env.GITHUB_CLIENT_ID;
      const redirect = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user`;
      return Response.redirect(redirect, 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const tokenJson = await tokenRes.json();
      const content = {
        token: tokenJson.access_token,
        provider: "github",
      };
      const script = `<!DOCTYPE html><html><body><script>
        (function(){
          function rec(e){ e.source.postMessage('authorization:github:success:${JSON.stringify(content)}','*'); }
          window.addEventListener('message',function(e){ if(e.data==='authorizing:github'){ rec(e); } },false);
          window.opener&&window.opener.postMessage('authorizing:github','*');
          rec({source:window.opener});
        })();
      </script><p>Giriş tamam. Bu pencereyi kapatabilirsiniz.</p></body></html>`;
      return new Response(script, { headers: { "Content-Type": "text/html;charset=utf-8", ...cors } });
    }

    return new Response("ÖZMAKSAN CMS OAuth", { headers: cors });
  },
};
