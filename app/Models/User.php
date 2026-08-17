<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use LdapRecord\Laravel\Auth\AuthenticatesWithLdap;
use LdapRecord\Laravel\Auth\LdapAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'username', 'email'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements LdapAuthenticatable
{
    /** @use HasFactory<UserFactory> */
    use AuthenticatesWithLdap, HasFactory, HasRoles, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_allowed' => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * Kill this user's active session(s) immediately - used when a
     * superadmin blocks or deletes them, so revocation doesn't wait for
     * their next self-triggered request (see EnsureUserIsAllowed).
     */
    public function forceLogout(): void
    {
        DB::table('sessions')->where('user_id', $this->id)->delete();
    }
}
