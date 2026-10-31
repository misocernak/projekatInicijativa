# Lepša Srbija

Platforma na kojoj ljudi objavljuju akcije u svom gradu (čišćenje, sadnja...) i drugi se prijavljuju kao volonteri. Bez novca.
`frontend/` (Vite, React, TypeScript, Tailwind v4) i `backend/` (Laravel 12 API). Push na `main` automatski deploy-uje na cPanel (GitHub Actions).

## Mapa projekta (Graphify)

Graf koda je u `graphify-out/` (lokalno, nije u gitu). **Pre pretraživanja koda po fajlovima prvo pitaj graf**:

```bash
graphify query "ParticipationController join"      # BFS oko imena iz koda (koristi engleska imena klasa/funkcija)
graphify explain "InitiativeDetail"                # šta je čvor i ko je oko njega
graphify affected "Initiative"                     # šta sve zavisi od ovoga (pre izmene)
graphify path "InitiativeDetail" "ParticipationController"
graphify god-nodes --top 10
```

Pregled zajednica i veza: `graphify-out/GRAPH_REPORT.md`; vizuelno: `graphify-out/graph.html`.

**Posle izmena koda osveži graf** (oko 10 s, bez API ključa): `graphify update .`
Posle većeg brisanja koda: `graphify update . --force`. Prvi put ili ako nestane graf: `graphify extract . --code-only` pa `graphify cluster-only . --no-label`.

## Pravila rada

- Tekstovi na sajtu su na srpskom (latinica, obraćanje sa "ti"), piše se "akcija", ne "inicijativa" (putanje u URL-u ostaju `/inicijative`, `/nova-inicijativa`).
- Bez kurziva i bez serifnog fonta. Boje su tokeni iz `frontend/src/index.css` (sage-dark #0b7a4b primarna).
- Nema PHP-a lokalno: backend se proverava testovima u CI (`.github/workflows/deploy-backend.yml`, deploy staje ako testovi padnu).
- Nova funkcija na backendu traži test u `backend/tests/Feature/`.
