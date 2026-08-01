<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsSuperadmin
{
    /**
     * Restrict a route to the superadmin role - used for admin-only areas
     * like User Access Management.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasRole('superadmin')) {
            abort(403);
        }

        return $next($request);
    }
}
