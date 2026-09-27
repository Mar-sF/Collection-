// Proxy pour Ma collection.
// À coller dans un Worker Cloudflare (dash.cloudflare.com > Workers > Create > Edit code).
// Il ne relaie que Steam, RAWG et ComicVine, et seulement pour ton site : ce n'est pas un proxy ouvert.

// Les sites autorisés à s'en servir. Mets ici l'adresse exacte de ton app (sans / final).
const ORIGINES_AUTORISEES = [
  "https://mar-sf.github.io"
];

const DOMAINES_AUTORISES = [
  "api.steampowered.com",
  "api.rawg.io",
  "store.steampowered.com",
  "comicvine.gamespot.com"
];

export default {
  async fetch(request) {
    // Un autre site web ne peut pas se servir de ton proxy. (Sans en-tête Origin : ouverture directe
    // dans le navigateur, utile pour tester.)
    const origine = request.headers.get("Origin");
    if (origine && !ORIGINES_AUTORISEES.includes(origine)) {
      return new Response(JSON.stringify({ erreur: "Origine non autorisée : " + origine }), { status: 403, headers: { "Content-Type": "application/json" } });
    }
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: enTetesCORS(origine) });
    }
    if (request.method !== "GET") {
      return json({ erreur: "Seul GET est accepté" }, 405, origine);
    }

    const url = new URL(request.url);
    // Accepte ?url=<encodé> et ?<encodé>
    const cible = url.searchParams.get("url") || decodeURIComponent(url.search.slice(1));
    if (!cible) {
      return json({ erreur: "URL cible manquante" }, 400, origine);
    }

    let hote;
    try {
      hote = new URL(cible).hostname;
    } catch (e) {
      return json({ erreur: "URL invalide" }, 400, origine);
    }
    if (!DOMAINES_AUTORISES.includes(hote)) {
      return json({ erreur: "Domaine non autorisé : " + hote }, 403, origine);
    }

    let reponse;
    try {
      reponse = await fetch(cible, { headers: { Accept: "application/json" } });
    } catch (e) {
      return json({ erreur: "Le service distant n'a pas répondu" }, 502, origine);
    }

    return new Response(reponse.body, {
      status: reponse.status,
      headers: {
        ...enTetesCORS(origine),
        "Content-Type": reponse.headers.get("Content-Type") || "application/json",
        "Cache-Control": "no-store"
      }
    });
  }
};

function enTetesCORS(origine) {
  return {
    "Access-Control-Allow-Origin": origine || ORIGINES_AUTORISEES[0],
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type"
  };
}

function json(objet, status, origine) {
  return new Response(JSON.stringify(objet), {
    status,
    headers: { ...enTetesCORS(origine), "Content-Type": "application/json" }
  });
}
