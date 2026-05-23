<?php

namespace Database\Seeders;

use App\Models\Developer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DeveloperSeeder extends Seeder
{
    public function run(): void
    {
        $name = $this->developerEnv('DEVELOPER_NAME');
        $email = $this->developerEnv('DEVELOPER_EMAIL');
        $password = $this->developerEnv('DEVELOPER_PASSWORD');

        if (! $name || ! $email || ! $password) {
            $this->command?->warn('Developer account was not seeded because DEVELOPER_NAME, DEVELOPER_EMAIL, or DEVELOPER_PASSWORD is missing.');

            return;
        }

        Developer::query()->updateOrCreate(
            ['email' => strtolower((string) $email)],
            [
                'name' => (string) $name,
                'password' => Hash::make((string) $password),
                'enabled' => true,
            ],
        );
    }

    private function developerEnv(string $key): mixed
    {
        $value = getenv($key);

        return $value !== false ? $value : env($key);
    }
}
