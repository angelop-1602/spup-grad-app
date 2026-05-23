<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function (): void {
    \App\Models\SystemHealthCheck::record('scheduler_heartbeat', 'ok', 'Scheduler executed heartbeat task.');
    \App\Jobs\RecordQueueHeartbeat::dispatch();
})->everyMinute()->name('system-heartbeat');
