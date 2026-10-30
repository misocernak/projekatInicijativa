<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Čuvanje slika inicijativa na disku "uploads".
 *
 * Ako je dostupan GD, slika se ponovo kodira kao JPEG (max 1600 px): tako se uklanjaju EXIF podaci
 * (npr. GPS lokacija sa telefona) i sve što nije prava slika. Bez GD-a čuva se original, uz ekstenziju
 * određenu po sadržaju (nikad po imenu koje je poslao korisnik).
 */
class ImageStore
{
    public const DIR = 'initiatives';
    public const MAX_SIDE = 1600;

    public static function store(UploadedFile $file, string $basename): string
    {
        $disk = Storage::disk('uploads');
        $bytes = (string) file_get_contents($file->getRealPath());

        if (function_exists('imagecreatefromstring')) {
            $source = @imagecreatefromstring($bytes);

            if ($source !== false) {
                $jpeg = self::encodeJpeg($source);
                $path = self::DIR.'/'.$basename.'.jpg';
                $disk->put($path, $jpeg);

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

    private static function encodeJpeg(\GdImage $source): string
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
        imagejpeg($canvas, null, 82);

        return (string) ob_get_clean();
    }
}
