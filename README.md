# Hizope-pilotage-web

Tableau de bord interne Hizope (Vue 3 + Vite) — usage de Joyce uniquement, distinct des
dashboards de chaque produit (CMicrolocks-admin, etc.). Appelle `Hizope-pilotage-api`.

## Sécurité

Pas de login applicatif dans le front : le site entier est protégé en amont par Caddy
(HTTP Basic Auth, un seul compte) — voir `hizope-scaleway-deploy/shared-vps/Caddyfile`.
Rien de sensible n'est donc géré côté Vue (pas de token, pas de session).

## Développement

```sh
npm install
npm run dev            # http://localhost:5176
```

Le proxy Vite renvoie `/api` vers `http://localhost:5080` (Hizope-pilotage-api en local).
Pour cibler une autre instance : `VITE_DEV_API_TARGET=http://localhost:5081 npm run dev`.

## Build

```sh
npm run build          # -> dist/
```

## Tests

```sh
npm test
```

## Déploiement (CI/CD)

`.github/workflows/deploy.yml` déploie automatiquement sur `cmicrlocks.fr` (VPS partagé)
à chaque push sur `main`. Secret GitHub requis (`Settings > Secrets and variables >
Actions`) :

| Nom | Type | Valeur |
|---|---|---|
| `DEPLOY_SSH_KEY` | Secret | Même clé de déploiement que les autres repos Hizope/CMicrolocks |

## Structure

```
src/
  services/reconciliation.api.js   # appels HTTP vers Hizope-pilotage-api
  utils/format.utils.js            # formatage montant/date (fr-FR)
  App.vue                          # module CMicrolocks — les prochains produits
                                    # (LoveList, Gaia) ajouteront leur propre section
```
