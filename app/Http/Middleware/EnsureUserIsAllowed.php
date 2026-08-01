<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAllowed
{
    /**
     * Block access to a JIT-provisioned user until a superadmin has
     * explicitly flipped is_allowed - see APP REQUIREMENT.md Auth section.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_allowed) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('status', 'pending-approval');
        }

        return $next($request);
    }
}
