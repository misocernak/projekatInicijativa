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
composer install (bez dev paketa) → rsync → `key:generate` (ako nema ključa) → `migrate --force` → config cache → provera `https://lepsasrbija.com/api/health`.

## Endpointi

- `GET /api/health` – status API-ja i baze
