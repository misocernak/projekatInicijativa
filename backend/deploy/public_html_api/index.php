<?php

/*
 * Ulazna tačka API-ja na cPanel hostingu.
 * Laravel aplikacija je van weba (~/lepsasrbija-api), a ovaj fajl je jedino što je javno dostupno.
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$root = dirname(__DIR__, 2).'/lepsasrbija-api';

if (file_exists($maintenance = $root.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require $root.'/vendor/autoload.php';

$app = require_once $root.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
