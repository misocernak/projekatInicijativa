<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Čuvanje slika akcija na disku "uploads".
 *
 * Ako je dostupan GD, slika se ponovo kodira kao WebP (max 1600 px, ili JPEG ako server nema WebP):
 * tako je fajl mali (stotinak KB umesto desetina MB) i uklanjaju se EXIF podaci (npr. GPS lokacija sa telefona)
 * i sve što nije prava slika. Bez GD-a čuva se original, uz ekstenziju
 * određenu po sadržaju (nikad po imenu koje je poslao korisnik).
 */
class ImageStore
{
    public const DIR = 'initiatives';
    public const MAX_SIDE = 1600;
    public const QUALITY = 80;

    public static function store(UploadedFile $file, string $basename): string
    {
        $disk = Storage::disk('uploads');
        $bytes = (string) file_get_contents($file->getRealPath());

        if (function_exists('imagecreatefromstring')) {
            $source = @imagecreatefromstring($bytes);

            if ($source !== false) {
                [$encoded, $extension] = self::encode($source);
                $path = self::DIR.'/'.$basename.'.'.$extension;
                $disk->put($path, $encoded);

                return $path;
            }
        }

        $extension = match ($file->getMimeType()) {
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => 'jpg',
        };
        $path = self::DIR.'/'.$basename.'.'.$extension;
        $disk->put($path, $bytes);

        return $path;
    }

    public static function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('uploads')->delete($path);
        }
    }

    /** @return array{0: string, 1: string} sadržaj i ekstenzija (webp, a jpg ako GD nema podršku za WebP) */
    private static function encode(\GdImage $source): array
    {
        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min(1, self::MAX_SIDE / max($width, $height));
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));

        // bela pozadina ispod providnih PNG/WebP slika
        $canvas = imagecreatetruecolor($newWidth, $newHeight);
        imagefill($canvas, 0, 0, imagecolorallocate($canvas, 255, 255, 255));
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);

        ob_start();
        if (function_exists('imagewebp')) {
            imagewebp($canvas, null, self::QUALITY);
            $extension = 'webp';
        } else {
            imagejpeg($canvas, null, 82);
            $extension = 'jpg';
        }

        return [(string) ob_get_clean(), $extension];
    }
}
