<?php

namespace App\Models;

use BaconQrCode\Renderer\Color\Rgb;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\Fill;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\Contracts\TwoFactorAuthenticationProvider;
use Laravel\Fortify\Fortify;
use Laravel\Fortify\TwoFactorAuthenticatable;

class Developer extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\DeveloperFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'enabled',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function twoFactorQrCodeSvg(): string
    {
        $svg = (new Writer(
            new ImageRenderer(
                new RendererStyle(192, 0, null, null, Fill::uniformColor(new Rgb(255, 255, 255), new Rgb(45, 55, 72))),
                new SvgImageBackEnd
            )
        ))->writeString($this->twoFactorQrCodeUrl());

        return trim(substr($svg, strpos($svg, "\n") + 1));
    }

    public function twoFactorQrCodeUrl(): string
    {
        return app(TwoFactorAuthenticationProvider::class)->qrCodeUrl(
            config('app.name').' Developer Console',
            $this->email,
            $this->twoFactorSecretKey()
        );
    }

    public function twoFactorSecretKey(): string
    {
        return Fortify::currentEncrypter()->decrypt($this->two_factor_secret);
    }
}
