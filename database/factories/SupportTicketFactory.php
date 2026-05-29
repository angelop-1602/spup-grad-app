<?php

namespace Database\Factories;

use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SupportTicket>
 */
class SupportTicketFactory extends Factory
{
    protected $model = SupportTicket::class;

    public function definition(): array
    {
        return [
            'status' => SupportTicket::STATUS_OPEN,
            'category' => fake()->randomElement(SupportTicket::CATEGORIES),
            'priority' => fake()->randomElement(SupportTicket::PRIORITIES),
            'subject' => fake()->sentence(5),
            'description' => fake()->paragraph(),
            'reporter_guard' => 'guest',
            'reporter_name' => fake()->name(),
            'reporter_email' => fake()->safeEmail(),
            'page_url' => fake()->url(),
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
        ];
    }

    public function resolved(): static
    {
        return $this->state(fn () => [
            'status' => SupportTicket::STATUS_RESOLVED,
            'resolved_at' => now(),
            'resolution_note' => fake()->sentence(),
        ]);
    }
}
