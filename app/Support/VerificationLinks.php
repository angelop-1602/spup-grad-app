<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class VerificationLinks
{
    public static function expirationMinutes(): int
    {
        return (int) config('auth.verification.expire', 1440);
    }

    public static function expiresAt(): Carbon
    {
        return Carbon::now()->addMinutes(self::expirationMinutes());
    }

    public static function expirationLabel(): string
    {
        $minutes = self::expirationMinutes();

        if ($minutes >= 1440 && $minutes % 1440 === 0) {
            $days = (int) ($minutes / 1440);

            return $days.' '.Str::plural('day', $days);
        }

        if ($minutes >= 60 && $minutes % 60 === 0) {
            $hours = (int) ($minutes / 60);

            return $hours.' '.Str::plural('hour', $hours);
        }

        return $minutes.' '.Str::plural('minute', $minutes);
    }

    /**
     * Generate an absolute URL whose signature is based on the path/query only.
     */
    public static function temporarySignedRoute(string $name, array $parameters): string
    {
        return url(URL::temporarySignedRoute($name, self::expiresAt(), $parameters, false));
    }

    public static function hasValidSignature(Request $request): bool
    {
        return self::hasCorrectSignature($request) && ! self::hasExpired($request);
    }

    public static function hasCorrectSignature(Request $request): bool
    {
        return URL::hasCorrectSignature($request)
            || URL::hasCorrectSignature($request, false)
            || self::hasCorrectConfiguredHostSignature($request);
    }

    public static function hasExpired(Request $request): bool
    {
        $expires = $request->query('expires');

        return $expires && Carbon::now()->getTimestamp() > (int) $expires;
    }

    private static function hasCorrectConfiguredHostSignature(Request $request): bool
    {
        $appUrl = config('app.url');

        if (! $appUrl) {
            return false;
        }

        $url = rtrim($appUrl, '/').'/'.ltrim($request->path(), '/');
        $queryString = collect(explode('&', (string) $request->server->get('QUERY_STRING')))
            ->reject(fn (string $parameter) => Str::before($parameter, '=') === 'signature')
            ->join('&');
        $original = rtrim($url.'?'.$queryString, '?');
        $signature = (string) $request->query('signature', '');
        $keys = [
            config('app.key'),
            ...(config('app.previous_keys') ?? []),
        ];

        foreach ($keys as $key) {
            if ($key && hash_equals(hash_hmac('sha256', $original, $key), $signature)) {
                return true;
            }
        }

        return false;
    }
}
