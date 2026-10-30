# lepšaSrbija.com – inicijative u tvom gradu

Platforma na kojoj građani objavljuju društveno korisne inicijative (uređenje, čišćenje, sadnja, pomoć komšijama) i pozivaju sugrađane da im se priključe. Bez prikupljanja sredstava.

Naziv sajta („Lepša Srbija“) menja se na jednom mestu: `frontend/src/data/constants.ts` (`BRAND`); logo je tekst u `frontend/src/components/Wordmark.tsx`.

## Struktura

```
frontend/   Vite + React + TypeScript + Tailwind v4 + React Router + Leaflet
backend/    Laravel API (PHP 8.2) – u pripremi
.github/    workflow za automatski deploy
```

## Frontend – razvoj

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # produkcioni build u frontend/dist
```

Front trenutno radi sa **mock podacima** i `localStorage`-om. Sav pristup podacima je u `frontend/src/api/index.ts`; kada back bude gotov, menja se samo taj fajl (fetch ka `/api/...`).

## Hosting i deploy (cPanel, lepsasrbija.com)

Svaki push na `main` koji menja `frontend/` pokreće `.github/workflows/deploy.yml`: build u GitHub Actions, pa `rsync` preko SSH-a u `~/public_html`.

Raspored na serveru (`/home/lepslnlp/`):

```
public_html/            front (dist)
  api/                  ulazna tačka Laravela (kasnije)
  uploads/              slike inicijativa (deploy ih ne dira)
  .well-known/          SSL provera (deploy ga ne dira)
lepsasrbija-api/        Laravel aplikacija, van weba (kasnije)
```

GitHub Secrets: `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`. Workflow proverava otisak SSH ključa servera pre slanja.
