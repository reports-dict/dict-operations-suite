<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BigQuerySyncLog extends Model
{
    // Eloquent's default pluralization guesses `big_query_sync_logs` (wrong)
    // from the class name - the actual table is `bigquery_sync_logs`.
    protected $table = 'bigquery_sync_logs';

    protected $fillable = [
        'sync_type',
        'status',
        'triggered_by',
        'started_at',
        'finished_at',
        'rows_synced',
        'error_message',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];
}
