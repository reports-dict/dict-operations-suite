<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:grant-superadmin {username : The AD samaccountname of the user to promote}')]
#[Description('Bootstrap the first superadmin - grants login access and the superadmin role, creating the user if they have not logged in via LDAP yet.')]
class GrantSuperadmin extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $username = $this->argument('username');

        $user = User::query()->firstOrNew(['username' => $username]);

        if (! $user->exists) {
            $user->name = $username;
            $user->email = "{$username}@placeholder.local";
        }

        $user->is_allowed = true;
        $user->save();

        $user->assignRole('superadmin');

        $this->info("{$username} is now a superadmin and allowed to log in.");

        if (! $user->wasRecentlyCreated) {
            return self::SUCCESS;
        }

        $this->comment('This user has not logged in via LDAP yet - their name/email above are placeholders and will be synced from AD on first login.');

        return self::SUCCESS;
    }
}
