<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class ProfilePhoto
{
    public static function url(?string $path): ?string
    {
        if (! $path = self::clean($path)) {
            return null;
        }

        if (preg_match('/^(https?:)?\/\//i', $path) || str_starts_with($path, 'data:')) {
            return $path;
        }

        $publicPath = self::publicPath($path);

        if ($publicPath && file_exists($publicPath)) {
            return asset(self::trimPublicPrefix($path));
        }

        $normalized = self::storagePath($path);

        return $normalized ? asset('storage/'.$normalized) : null;
    }

    public static function path(?string $path): ?string
    {
        if (! $path = self::clean($path)) {
            return null;
        }

        $normalized = self::storagePath($path);

        if ($normalized && Storage::disk('public')->exists($normalized)) {
            return Storage::disk('public')->path($normalized);
        }

        $publicStoragePath = $normalized ? public_path('storage/'.$normalized) : null;

        if ($publicStoragePath && file_exists($publicStoragePath)) {
            return $publicStoragePath;
        }

        $publicPath = self::publicPath($path);

        return $publicPath && file_exists($publicPath) ? $publicPath : null;
    }

    public static function storagePath(?string $path): ?string
    {
        if (! $path = self::clean($path)) {
            return null;
        }

        $path = self::trimPublicPrefix($path);

        foreach (['storage/', 'app/public/'] as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $path = substr($path, strlen($prefix));
            }
        }

        return $path !== '' ? $path : null;
    }

    private static function publicPath(string $path): ?string
    {
        $trimmed = self::trimPublicPrefix($path);

        return $trimmed !== '' ? public_path($trimmed) : null;
    }

    private static function trimPublicPrefix(string $path): string
    {
        $path = self::clean($path) ?? '';

        return str_starts_with($path, 'public/')
            ? substr($path, strlen('public/'))
            : $path;
    }

    private static function clean(?string $path): ?string
    {
        $path = trim((string) $path);

        if ($path === '') {
            return null;
        }

        return ltrim(str_replace('\\', '/', $path), '/');
    }
}
