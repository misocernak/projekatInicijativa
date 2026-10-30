<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

/**
 * Dnevni dump baze (gzip) u ~/backups, uz brisanje starijih kopija. Zahteva mysqldump na serveru.
 * Fajlovi ostaju na istom nalogu: ovo štiti od greške u aplikaciji, ne od gubitka celog hostinga.
 */
class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--keep=14 : Koliko poslednjih kopija se čuva}';

    protected $description = 'Pravi gzip dump baze u ~/backups i briše stare kopije';

    public function handle(): int
    {
        $config = config('database.connections.'.config('database.default'));

        if (($config['driver'] ?? null) !== 'mysql' && ($config['driver'] ?? null) !== 'mariadb') {
            $this->warn('Backup radi samo za MySQL/MariaDB.');

            return self::SUCCESS;
        }

        $dir = env('BACKUP_PATH', base_path('../backups'));

        if (! is_dir($dir) && ! @mkdir($dir, 0700, true)) {
            $this->error("Ne mogu da napravim folder {$dir}.");

            return self::FAILURE;
        }

        $file = $dir.'/baza-'.now()->format('Y-m-d_His').'.sql.gz';
        $gz = gzopen($file, 'wb9');

        if ($gz === false) {
            $this->error("Ne mogu da upišem {$file}.");

            return self::FAILURE;
        }

        // lozinka ide kroz okruženje procesa, ne kroz argumente (ne vidi se u listi procesa)
        $process = new Process([
            'mysqldump', '--single-transaction', '--quick', '--no-tablespaces',
            '-h', (string) $config['host'], '-P', (string) $config['port'], '-u', (string) $config['username'],
            (string) $config['database'],
        ], null, ['MYSQL_PWD' => (string) $config['password']]);
        $process->setTimeout(300);
        $process->run(function ($type, $buffer) use ($gz) {
            if ($type === Process::OUT) {
                gzwrite($gz, $buffer);
            }
        });
        gzclose($gz);

        if (! $process->isSuccessful()) {
            @unlink($file);
            $this->error('mysqldump nije uspeo: '.trim($process->getErrorOutput()));

            return self::FAILURE;
        }

        @chmod($file, 0600);
        $this->info('Sačuvano: '.$file);

        $files = glob($dir.'/baza-*.sql.gz') ?: [];
        rsort($files);
        foreach (array_slice($files, max(1, (int) $this->option('keep'))) as $old) {
            @unlink($old);
        }

        return self::SUCCESS;
    }
}
