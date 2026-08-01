<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->userName();

        return [
            'name' => fake()->name(),
            'username' => $name,
            'email' => fake()->unique()->safeEmail(),
            'guid' => (string) Str::uuid(),
            'domain' => 'default',
            'is_allowed' => false,
            'remember_token' => Str::random(10),
        ];
    }

    /**
     * Indicate that the user is allowed to log in.
     */
    public function allowed(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_allowed' => true,
        ]);
    }
}
