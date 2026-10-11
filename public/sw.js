// Service worker Competencia.
//
// Règle d'or : ne JAMAIS mettre en cache une réponse qui dépend du compte
// connecté. Le cache est partagé par tous les comptes qui se connectent
// depuis le même navigateur — y mettre une page ou une réponse d'API, c'est
// montrer les données d'un formateur au suivant.
//
// v2 : la v1 pre-cachait "/" (le tableau de bord, donc du contenu utilisateur)
// et servait cache-first TOUTE requête non-navigation, y compris les charges
// RSC de Next.js et les appels /api/*.

const CACHE_NAME = "competencia-v2";

// Uniquement des fichiers statiques, identiques pour tout le monde.
const STATIC_ASSETS = ["/logo-ofppt.jpg", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // Supprime competencia-v1, qui contient le tableau de bord d'un compte.
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.origin === self.location.origin &&
    (STATIC_ASSETS.includes(url.pathname) ||
      url.pathname.startsWith("/_next/static/"))
  );
}

self.addEventListener("fetch", (e) => {
  const { request } = e;

  // Seules les requêtes GET sont éligibles au cache.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Jamais de cache pour les API ni pour l'authentification.
  if (url.pathname.startsWith("/api/")) return;

  // Jamais de cache pour les charges RSC de Next.js : elles portent le
  // contenu rendu pour UN compte précis.
  if (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1") return;

  // Statique immuable : cache-first, sans risque de fuite.
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Tout le reste (pages comprises) : réseau uniquement. Hors ligne, on laisse
  // le navigateur afficher son erreur plutôt que la page d'un autre compte.
});
