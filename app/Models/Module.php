<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    protected $fillable = ['slug', 'name'];

    /**
     * The Spatie permission name that gates access to this module.
     */
    public function permissionName(): string
    {
        return "operations.{$this->slug}.view";
    }
}
