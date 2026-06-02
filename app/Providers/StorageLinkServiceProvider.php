<?php

namespace App\Providers;

use Illuminate\Support\Facades\File;
use Illuminate\Support\ServiceProvider;

class StorageLinkServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Ensure storage symlink exists for public access to uploaded files
        $link = public_path('storage');
        $target = storage_path('app/public');

        // Check if symlink doesn't exist or is broken
        if (! file_exists($link) || ! is_link($link)) {
            // Remove if it exists but is not a symlink (e.g., a directory)
            if (file_exists($link) && ! is_link($link)) {
                File::deleteDirectory($link);
            }

            // Create the target directory if it doesn't exist
            if (! File::exists($target)) {
                File::makeDirectory($target, 0755, true);
            }

            // Create subdirectories if they don't exist
            $subdirectories = ['profile-photos'];
            foreach ($subdirectories as $subdir) {
                $subdirPath = $target.'/'.$subdir;
                if (! File::exists($subdirPath)) {
                    File::makeDirectory($subdirPath, 0755, true);
                }
            }

            // Try to create symlink (may fail on some shared hosting)
            try {
                if (function_exists('symlink')) {
                    symlink($target, $link);
                }
            } catch (\Exception $e) {
                // Symlink creation failed - this is common on shared hosting
                // Files will still be saved, but may need manual symlink creation
                \Log::warning('Storage symlink could not be created automatically: '.$e->getMessage());
            }
        }
    }
}
