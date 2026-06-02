<?php

namespace App\Console\Commands;

use App\Models\ApplicationRequirement;
use App\Support\RequirementFileStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MigrateRequirementFilesToPrivate extends Command
{
    protected $signature = 'requirement-files:migrate-private {--dry-run : Report files without moving them}';

    protected $description = 'Move legacy requirement uploads from public storage to private storage.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $storage = app(RequirementFileStorage::class);
        $public = Storage::disk('public');
        $private = Storage::disk('local');
        $moved = 0;
        $missing = 0;
        $skipped = 0;

        ApplicationRequirement::query()
            ->whereNotNull('file_path')
            ->orderBy('id')
            ->each(function (ApplicationRequirement $requirement) use ($dryRun, $storage, $public, $private, &$moved, &$missing, &$skipped): void {
                $path = (string) $requirement->file_path;

                if (! $storage->isRequirementPath($path)) {
                    $skipped++;

                    return;
                }

                if ($private->exists($path)) {
                    if ($public->exists($path) && ! $dryRun) {
                        $public->delete($path);
                    }

                    $skipped++;

                    return;
                }

                if (! $public->exists($path)) {
                    $missing++;

                    return;
                }

                if (! $dryRun) {
                    $private->put($path, $public->get($path));
                    $public->delete($path);
                }

                $moved++;
            });

        $prefix = $dryRun ? 'Dry run complete.' : 'Migration complete.';
        $this->info("{$prefix} Moved: {$moved}; skipped: {$skipped}; missing: {$missing}.");

        return self::SUCCESS;
    }
}
