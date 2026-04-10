<?php

namespace App;

enum AdminRole: string
{
    case Admin = 'admin';
    case SuperAdmin = 'super_admin';
    case Moderator = 'moderator';

    /**
     * Get the display label for the role.
     */
    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Admin',
            self::SuperAdmin => 'Super Admin',
            self::Moderator => 'Moderator',
        };
    }

    /**
     * Get all role values.
     *
     * @return array<string>
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
