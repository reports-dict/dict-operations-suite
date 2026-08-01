<?php

namespace App\Providers;

use App\Models\User;
use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use App\Services\Operations\DriverAssignment\GoogleBigQueryClient;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bound as an interface so tests can swap in a fake without ever
        // hitting real BigQuery - see Driver Assignment module tests.
        $this->app->singleton(BigQueryClient::class, GoogleBigQueryClient::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(fn (User $user, string $ability) => $user->hasRole('superadmin') ? true : null);
    }
}
