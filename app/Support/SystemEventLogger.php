<?php

namespace App\Support;

use App\Models\GuestApplicationDraft;
use App\Models\SystemEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class SystemEventLogger
{
    /**
     * @param  array<string, mixed>  $meta
     * @param  array<string, mixed>|null  $actor
     */
    public function log(
        string $module,
        string $action,
        ?string $message = null,
        string $status = 'success',
        string $severity = 'info',
        ?Model $subject = null,
        array $meta = [],
        ?array $actor = null,
        ?Request $request = null,
    ): void {
        try {
            $request ??= request();
            $actor ??= $this->detectActor($request);

            SystemEvent::query()->create([
                'module' => $module,
                'action' => $action,
                'status' => $status,
                'severity' => $severity,
                'actor_guard' => $actor['actor_guard'] ?? null,
                'actor_type' => $actor['actor_type'] ?? null,
                'actor_id' => $actor['actor_id'] ?? null,
                'actor_label' => $actor['actor_label'] ?? null,
                'subject_type' => $subject ? $subject::class : null,
                'subject_id' => $subject?->getKey(),
                'message' => $message,
                'ip_address' => $request?->ip(),
                'user_agent' => $request?->userAgent(),
                'meta' => $this->redact($meta),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('System event logging failed.', [
                'message' => $e->getMessage(),
                'module' => $module,
                'action' => $action,
            ]);
        }
    }

    /**
     * @return array{actor_guard: string, actor_type: class-string<GuestApplicationDraft>, actor_id: int|null, actor_label: string}
     */
    public static function studentGuest(GuestApplicationDraft $draft): array
    {
        return [
            'actor_guard' => 'student_guest',
            'actor_type' => GuestApplicationDraft::class,
            'actor_id' => $draft->getKey(),
            'actor_label' => trim('Student Guest '.$draft->student_id),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function detectActor(?Request $request): array
    {
        foreach (['developer', 'admin', 'coordinator', 'web'] as $guard) {
            $user = Auth::guard($guard)->user();

            if (! $user) {
                continue;
            }

            return [
                'actor_guard' => $guard === 'web' ? 'student' : $guard,
                'actor_type' => $user::class,
                'actor_id' => $user->getKey(),
                'actor_label' => $user->name ?? $user->email ?? class_basename($user),
            ];
        }

        return [
            'actor_guard' => $request ? 'guest' : 'system',
            'actor_type' => null,
            'actor_id' => null,
            'actor_label' => $request ? 'Guest' : 'System',
        ];
    }

    /**
     * @param  mixed  $value
     * @return mixed
     */
    private function redact($value)
    {
        if (! is_array($value)) {
            return $value;
        }

        return collect($value)
            ->mapWithKeys(function ($item, $key) {
                $normalizedKey = Str::of((string) $key)->lower()->replace('-', '_')->toString();

                if ($this->isSensitiveKey($normalizedKey)) {
                    return [$key => '[redacted]'];
                }

                if (is_array($item)) {
                    return [$key => $this->redact($item)];
                }

                if ($item instanceof Model) {
                    return [$key => [
                        'type' => $item::class,
                        'id' => $item->getKey(),
                    ]];
                }

                if (is_string($item)) {
                    return [$key => $this->redactString($item)];
                }

                return [$key => $item];
            })
            ->all();
    }

    private function isSensitiveKey(string $key): bool
    {
        if (in_array($key, ['path', 'file_path', 'api_key', 'access_url', 'verification_url', 'signed_url', 'reset_link'], true)) {
            return true;
        }

        return Str::contains($key, [
            'password',
            'token',
            'secret',
            'recovery',
            'tracking_pin',
            'two_factor',
            'hash',
            'signature',
        ]);
    }

    private function redactString(string $value): string
    {
        return preg_replace('/(password|token|secret|recovery|tracking_pin|api_key|signature|hash|expires)=([^\s&]+)/i', '$1=[redacted]', $value) ?? $value;
    }

    public static function emailMeta(?string $email): array
    {
        if (! $email || ! str_contains($email, '@')) {
            return [];
        }

        return [
            'email_hash' => hash('sha256', Str::lower($email)),
            'email_domain' => Str::of($email)->afterLast('@')->lower()->toString(),
        ];
    }
}
