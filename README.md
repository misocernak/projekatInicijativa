# Zajedno – inicijative u tvom gradu

Platforma na kojoj građani objavljuju društveno korisne inicijative (uređenje, čišćenje, sadnja, pomoć komšijama) i pozivaju sugrađane da im se priključe. Bez novca i prikupljanja sredstava.

Radni naziv „Zajedno“ menja se na jednom mestu: `src/data/constants.ts` (`BRAND`).

## Stack

- Front: Vite + React + TypeScript + Tailwind CSS v4 + React Router
- Mapa: Leaflet + OpenStreetMap
- Back (planirano): PHP 8 + MySQL na cPanel hostingu, REST API na `/api`

## Pokretanje

```bash
npm install
npm run dev      # razvoj na http://localhost:5173
npm run build    # produkcioni build u dist/
```

## Deploy na cPanel

1. `npm run build`
2. Sadržaj foldera `dist/` upload-uj u `public_html` (File Manager ili FTP).
3. `.htaccess` (već u `public/`, ide u `dist/` pri build-u) preusmerava sve rute na `index.html`, a `/api` ostavlja PHP-u.

## Trenutno stanje

Front radi sa **mock podacima** i `localStorage`-om (prijava, kreirane inicijative i prijave se čuvaju samo u pretraživaču). Sav pristup podacima je u `src/api/index.ts`. Kada back bude gotov, menja se samo taj fajl (fetch ka `/api/...`), a stranice ostaju iste.

## Struktura

```
src/
  api/          pristup podacima (mock → PHP API)
  components/   Layout, kartice, mapa
  context/      AuthContext
  data/         konstante (gradovi, kategorije, brend) i mock podaci
  lib/          datumi, useAsync
  pages/        Home, Initiatives, InitiativeDetail, NewInitiative, Auth, Profile, About
```
