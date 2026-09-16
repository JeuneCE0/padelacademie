# Funnel v7 — branchement GoHighLevel

Le quiz calcule tout côté navigateur et poste le lead sur `/api/optin` (fonction Vercel,
`api/optin.js`). La fonction pousse dans GHL, dans cet ordre :

1. **Contact** (upsert sur email/téléphone) — prénom, email, téléphone E.164, source
   « Quiz Plan de Progression v7 », tags `quiz-v7`, `profil-<clé>`, `niveau-<n>`,
   et les champs personnalisés ci-dessous.
2. **Note** sur le contact : récap complet du diagnostic + toutes les réponses (pour l'appel).
3. **Opportunité** dans le pipeline `GHL_PIPELINE_NAME` (sinon le premier pipeline), première
   étape, source `QUIZ V7`.

Variables d'env Vercel (déjà présentes sur Dev/Preview/Prod) : `GHL_API_KEY`, `GHL_LOCATION_ID`,
optionnel `GHL_PIPELINE_NAME`. La clé doit avoir les scopes contacts, opportunities,
**locations/customFields** (write) — sinon les champs ne sont pas créés (visible dans les logs
Vercel `[optin] GHL customField create error`).

## Champs personnalisés (créés automatiquement au premier lead)

| Champ GHL (`{{contact.…}}`) | Contenu | Exemple |
|---|---|---|
| `profil` | clé du profil (pour l'embranchement E4) | `muraille` · `brute` · `pousseur` · `pile` |
| `profil_nom` | nom affiché | La Muraille |
| `profil_emoji` | emoji | 🧱 |
| `niveau` | niveau 1→8 | 4 |
| `niveau_nom` | nom du palier | Competitor |
| `niveau_suivant` | niveau + 1 (plafonné à 8) | 5 |
| `score_niveau` | score brut 0→24 | 13 |
| `douleur_top` | phrase la plus notée (échelle 1→5) | Je perds contre des paires que je devrais battre |
| `douleur_top_note` | sa note | 5 |
| `phrase_profil` | phrase miroir du profil | Tu remets tout, tu ne rates rien… |
| `erreur_principale` | erreur n°1 | attendre l'erreur adverse au lieu de la provoquer |
| `premiere_action` | action à tester au prochain match | Sur une balle facile, choisis une cible AVANT… |
| `conseil_profil` | conseil long (WA J+2) | Sur les 3 premières balles hautes… |
| `motivation` · `objectif` · `projection` · `qualification` · `investissement` | réponses brutes | — |
| `quiz_date` | date ISO du diagnostic | 2026-09-16 |

Dans les templates GHL, `{{prenom}}` des sources = `{{contact.first_name}}`, et chaque
`{{xxx}}` = `{{contact.xxx}}`. `{{cta}}` = le lien de réservation (taap.it/w19uRyL).
Fallbacks GHL pour champs vides : `{{contact.douleur_top | "cette frustration"}}`.

## Workflows à créer dans GHL

- **Déclencheur** : tag ajouté `quiz-v7` (ou contact créé avec source « Quiz Plan de Progression v7 »).
- **WhatsApp** : J0 +2 min (résultat, template unique), J+1 (cas client), J+2 (conseil), J+4 matin (invitation).
  Textes dans `sequence-mail-whatsapp.html`.
- **Emails** : E1 J0 +30 min → E8 J+7, textes dans `sequence-emails-v2.1.md`.
  E4 = seul embranchement : condition sur `contact.profil` (4 branches).
- **Sortie** : à la réservation du calendrier, ajouter le tag `rdv-reserve` ; condition « ne pas
  envoyer si tag rdv-reserve » sur E8 (obligatoire) et sur les CTA « appel ».
  Après J+7 : bascule newsletter, plus aucun email « appel ».
- **Calendrier** : redirection après réservation vers `https://quizz.padelacademie.fr/merci`
  (page de remerciement, VSL n°2 + cadre dur).

## Pixel Meta

Coller le code de base du pixel dans le `<head>` de `index.html` et `merci.html`. Les événements
sont déjà déclenchés si `fbq` existe : `Lead` à l'optin (avec `content_category` = profil),
`Schedule` sur `/merci`.

## Lien direct depuis une pub

`https://quizz.padelacademie.fr/?start=1` ouvre directement la première question (saute la landing).
