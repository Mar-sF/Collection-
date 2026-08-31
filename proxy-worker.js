// Proxy pour Ma collection.
// À coller dans un Worker Cloudflare (dash.cloudflare.com > Workers > Create > Edit code).
// Il ne relaie que Steam et RAWG : ce n'est pas un proxy ouvert.

const DOMAINES_AUTORISES = [
  "api.steampowered.com",
  "api.rawg.io"
];

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: enTetesCORS() });
    }

    const url = new URL(request.url);
    // Accepte ?url=<encodé> et ?<encodé>
    const cible = url.searchParams.get("url") || decodeURIComponent(url.search.slice(1));
    if (!cible) {
      return json({ erreur: "URL cible manquante" }, 400);
    }

    let hote;
    try {
      hote = new URL(cible).hostname;
    } catch (e) {
      return json({ erreur: "URL invalide" }, 400);
    }
    if (!DOMAINES_AUTORISES.includes(hote)) {
      return json({ erreur: "Domaine non autorisé : " + hote }, 403);
    }

    let reponse;
    try {
      reponse = await fetch(cible, { headers: { Accept: "application/json" } });
    } catch (e) {
      return json({ erreur: "Le service distant n'a pas répondu" }, 502);
    }

    return new Response(reponse.body, {
      status: reponse.status,
      headers: {
        ...enTetesCORS(),
        "Content-Type": reponse.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  }
};

function enTetesCORS() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type"
  };
}

function json(objet, status) {
  return new Response(JSON.stringify(objet), {
    status,
    headers: { ...enTetesCORS(), "Content-Type": "application/json" }
  });
}
