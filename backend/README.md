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

Oblik inicijative u odgovoru je isti kao tip `Initiative` na frontu (`frontend/src/types.ts`).

## Šema baze

`users` (password prazan za brze naloge, `role`), `cities`, `categories`, `initiatives` (ULID id),
`participations` (pending / confirmed / cancelled; samo confirmed se broji u `participants`).

## Testovi

`php artisan test` (SQLite u memoriji). U Actions se pokreću pri svakom deploy-u.

## Reset baze (samo dok nema pravih podataka)

```bash
cd ~/lepsasrbija-api && php artisan migrate:fresh --force --seed
```
