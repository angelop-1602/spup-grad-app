<?php

namespace App\Jobs;

use App\Models\SystemHealthCheck;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RecordQueueHeartbeat implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        SystemHealthCheck::record('queue_worker_heartbeat', 'ok', 'Queue worker processed heartbeat job.');
    }
}
