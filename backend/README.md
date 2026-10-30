# Backend (Laravel 12, API)

PHP 8.2, Sanctum, MySQL. Skelet je generisan u GitHub Actions (nema lokalnog PHP-a).

## Na serveru (`/home/lepslnlp/`)

```
lepsasrbija-api/                 cela aplikacija (vendor, .env, storage), van weba
public_html/api/index.php        jedina javna ulazna tačka (backend/deploy/public_html_api)
```

`.env` se pravi ručno jednom (šablon: `.env.example`), deploy ga ne dira.

## Deploy

Push u `main` koji menja `backend/` pokreće `.github/workflows/deploy-backend.yml`:
composer install → **testovi** (deploy staje ako padnu) → composer install bez dev paketa → rsync → `key:generate` (ako nema ključa) → `migrate --force` → `db:seed ReferenceDataSeeder` (gradovi i kategorije, idempotentno) → config cache → provera `https://lepsasrbija.com/api/health`.

## Endpointi

- `GET /api/health` – status API-ja i baze
- `GET /api/cities`, `GET /api/categories` – šifarnici (oblik isti kao na frontu)
- `GET /api/initiatives?city=&category=&status=&q=&per_page=` – lista (paginirana); `status`: upcoming, ongoing, finished, permanent, cancelled
- `GET /api/initiatives/{id}` – detalj

Nalog (sesija preko kolačića, isti domen; front prvo poziva `GET /api/sanctum/csrf-cookie`):

- `POST /api/register` (ime, mejl, lozinka + potvrda, grad, `consent`), `POST /api/login`, `POST /api/logout`, `GET /api/me`
- `GET /api/email/verify/{id}/{hash}` – potpisan link iz mejla, vodi na front `/potvrda-mejla?status=ok|invalid`
- `POST /api/email/verification-notification` – ponovno slanje potvrde
- `POST /api/forgot-password`, `POST /api/reset-password` – link vodi na front `/nova-lozinka?token=..&email=..`
  (radi i za "brze" naloge bez lozinke: link iz mejla dokazuje vlasništvo adrese)
- Front pri registraciji pita: "potpuno nov/a" (cela forma) ili "već sam se prijavljivao/la na inicijative" (samo mejl, poziva se `/forgot-password`).
- Ako neko izabere "nov/a", a mejl već ima "brzi" nalog (nastao prijavom na inicijativu bez naloga) ne daje grešku: odgovor je `202 activation-sent`
  i na tu adresu stiže mejl "Aktiviraj svoj nalog" sa linkom za lozinku. Nalog se tako ne može preuzeti bez pristupa mejlu.
- `POST /api/admin/users/{id}/password-link` – admin šalje korisniku isti link (npr. prijatelju koji se prijavio samo mejlom)

Oblik inicijative u odgovoru je isti kao tip `Initiative` na frontu (`frontend/src/types.ts`).

Inicijative (potrebna prijava i potvrđen mejl):

- `POST /api/initiatives` (multipart, opciono `image`), `PUT /api/initiatives/{id}`, `POST /api/initiatives/{id}/cancel`
- `POST|DELETE /api/initiatives/{id}/image` – slika (re-kodira se u JPEG max 1600 px, uklanja EXIF)
- `GET /api/initiatives/{id}/participants` – spisak prijavljenih, samo organizator
- `GET /api/admin/stats`, `GET /api/admin/users`, `POST /api/admin/users/{id}/role` – statistika, pregled naloga i dodela admin uloge (samo admin;
  ne može se menjati sopstvena uloga, a admin može postati samo nalog sa potvrđenim mejlom)
- `GET /api/me/initiatives`, `GET /api/me/participations`
- Izmena termina/mesta i otkazivanje šalju mejl potvrđenim prijavljenima

Prijava volontera:

- `POST /api/initiatives/{id}/join` – prijavljen i potvrđen korisnik: odmah potvrđeno. Gost (`name`, `email`, `consent`) ili
  nepotvrđen nalog: čeka klik na link iz mejla (`GET /api/participations/{id}/confirm`, potpisan, važi 3 dana).
  Posle potvrde stiže mejl sa detaljima, kalendarom (.ics) i linkom za odjavu (`.../cancel`).
- `DELETE /api/initiatives/{id}/join` – odjava (prijavljen korisnik)
- Zaštite: najviše 3 pokušaja na sat po mejl adresi, postojeći nalog se nikad ne menja preko obrasca za goste

Slike idu na disk `uploads` (`public_html/uploads` na produkciji), a front ih dobija kao pun URL u polju `image`.

Prijava preko Google-a (OAuth 2.0, tok sa autorizacionim kodom, bez dodatnih paketa):

- `GET /api/auth/providers` – da li je Google podešen (front tek tada prikazuje dugme)
- `GET /api/auth/google/redirect?from=/putanja` i `GET /api/auth/google/callback` (u `routes/web.php`, jer traže sesiju)
- prihvata samo mejl koji je Google potvrdio; nalog sa istom adresom se povezuje (uloga ostaje), novi nalog je bez lozinke i uvek `user`
- podešavanje: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` u `.env` (vidi `.env.example`)

## Šema baze

`users` (password prazan za brze naloge, `role`), `cities`, `categories`, `initiatives` (ULID id),
`participations` (pending / confirmed / cancelled; samo confirmed se broji u `participants`).

## Primeri inicijativa (opciono)

`DemoSeeder` pravi 7 primera da sajt ne bude prazan; ne pokreće se automatski. Na serveru:

```bash
cd ~/lepsasrbija-api && php artisan db:seed --class=DemoSeeder --force
```

Uklanja se brisanjem demo naloga (inicijative se brišu kaskadno):

```bash
cd ~/lepsasrbija-api && php artisan tinker --execute="App\Models\User::where('email','demo@lepsasrbija.com')->delete();"
```

## Testovi

`php artisan test` (SQLite u memoriji). U Actions se pokreću pri svakom deploy-u.

## Reset baze (samo dok nema pravih podataka)

```bash
cd ~/lepsasrbija-api && php artisan migrate:fresh --force --seed
```
