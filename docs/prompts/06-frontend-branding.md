# J6-J7 — Frontend, brand & art direction

> Traçabilité IA (SPEC §5.5). Itérations produit/DA menées avec l'utilisateur.

## Frontend
Next.js 15 + wagmi/viem branché sur les contrats live Sepolia. Structure finale :
- **Landing** (`/`) : hero **vidéo de ville** en boucle (Coverr, licence libre, auto-hébergée
  `public/hero.mp4`, 1080p ≥15s) + sections de présentation façon Ondo (protocole, how-it-works, trust
  layers, built-on, CTA). **Aucune fenêtre de swap**, aucun chiffre hardcodé.
- **App** (Launch app) : onglets Market (achat réel + courbe de valeur), Sell (World Selfie Check),
  Desk (onboard/revoke ENS). Le swap ne vit que dans l'app.
- **Docs** (`/docs`) : page de documentation propre (TOC + prose) — overview, pricing, identity &
  trust, using the app, contrats live, limites honnêtes.
- Fix build : alias webpack `@base-org/account`/`@coinbase/cdp-sdk`/`@x402/evm`=false (barrel wagmi).

## Marque : Under
Renommé successivement Cloud Credits → Tenor → **Under** (choix utilisateur ; « Tenor » jugé trop
courant en hackathon). Logo fourni = wordmark **UNDER** noir ; traité en PNG transparent détouré
(`public/under.png`), affiché noir dans l'app/docs et blanc (inversion CSS) sur la vidéo.

## DA (pilotée par le logo, inspiration Ondo)
Le logo étant un noir pur → **DA monochrome** : fond papier chaud, encre quasi-noire, boutons noirs,
liens/marqueurs/courbe/pastilles en encre, liens de doc soulignés, rouge brique réservé aux erreurs.
Police **General Sans** (équivalent libre de la Gellix d'Ondo). Appliquée à landing + app + docs.

## Utilisation de l'IA
Contrats, tests, script de déploiement, frontend et intégration World écrits par Claude Code ;
décisions d'architecture et de DA arbitrées puis validées par l'humain.
