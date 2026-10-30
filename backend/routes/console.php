<?php

use Illuminate\Support\Facades\Schedule;

/*
 * Raspored zadataka. Na serveru ga pokreće jedan cron na svaki minut:
 *   * * * * * cd /home/lepslnlp/lepsasrbija-api && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
 */
Schedule::command('initiatives:send-reminders')->hourly()->withoutOverlapping();
Schedule::command('db:backup')->dailyAt('03:15')->withoutOverlapping();
