<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        // Powers "Active now" / "last seen X ago" on Admin > User Access.
        // Throttled to at most once/minute/user to avoid a write on every
        // request. Goes straight through the query builder rather than the
        // Eloquent model - saveQuietly() would still bump updated_at (it
        // only suppresses model events, not timestamp maintenance), which
        // would repurpose that column from "last intentionally edited" into
        // "user last clicked something."
        if ($user && (! $user->last_seen_at || $user->last_seen_at->lt(now()->subMinute()))) {
            DB::table('users')->where('id', $user->id)->update(['last_seen_at' => now()]);
        }

        return $next($request);
    }
}
