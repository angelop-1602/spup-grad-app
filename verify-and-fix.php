<?php

/**
 * Verification and Cache Clearing Script for Production
 * 
 * This script will:
 * 1. Verify the Coordinator ApplicationController file is correct
 * 2. Check for duplicate files
 * 3. Clear all caches
 * 
 * Run: php verify-and-fix.php
 */

echo "=== Verification and Cache Clearing Script ===\n\n";

// Step 1: Check Coordinator ApplicationController file
echo "1. Checking Coordinator ApplicationController file...\n";
$coordinatorControllerPath = __DIR__.'/app/Http/Controllers/Coordinator/ApplicationController.php';

if (!file_exists($coordinatorControllerPath)) {
    echo "   ✗ ERROR: File not found at: $coordinatorControllerPath\n";
    exit(1);
}

$content = file_get_contents($coordinatorControllerPath);

// Check for problematic import
if (strpos($content, 'use App\Http\Controllers\ApplicationController as StudentApplicationController;') !== false) {
    echo "   ✗ ERROR: File still contains the problematic import!\n";
    echo "   Please ensure you uploaded the correct version without this import.\n";
    exit(1);
}

// Check for correct usage
if (strpos($content, 'return \App\Http\Controllers\ApplicationController::generateDocx') === false) {
    echo "   ⚠ WARNING: Could not find the fully qualified class name usage.\n";
} else {
    echo "   ✓ File uses fully qualified class name correctly\n";
}

// Check namespace
if (strpos($content, 'namespace App\Http\Controllers\Coordinator;') === false) {
    echo "   ✗ ERROR: Namespace is incorrect!\n";
    exit(1);
} else {
    echo "   ✓ Namespace is correct\n";
}

// Step 2: Check routes/coordinator.php
echo "\n2. Checking routes/coordinator.php file...\n";
$coordinatorRoutesPath = __DIR__.'/routes/coordinator.php';

if (!file_exists($coordinatorRoutesPath)) {
    echo "   ✗ ERROR: File not found at: $coordinatorRoutesPath\n";
    exit(1);
}

$routesContent = file_get_contents($coordinatorRoutesPath);

// Check for problematic use statement
if (preg_match('/^use App\\\\Http\\\\Controllers\\\\Coordinator\\\\ApplicationController;/m', $routesContent)) {
    echo "   ✗ ERROR: File still contains 'use App\\Http\\Controllers\\Coordinator\\ApplicationController;'!\n";
    echo "   Please ensure you uploaded the correct version without this use statement.\n";
    exit(1);
}

// Check for fully qualified names
if (strpos($routesContent, '\\App\\Http\\Controllers\\Coordinator\\ApplicationController::class') === false) {
    echo "   ⚠ WARNING: Could not find fully qualified class name in routes.\n";
} else {
    echo "   ✓ Routes use fully qualified class names\n";
}

// Step 3: Check for duplicate files
echo "\n3. Checking for duplicate ApplicationController files...\n";
$files = [
    __DIR__.'/app/Http/Controllers/ApplicationController.php',
    __DIR__.'/app/Http/Controllers/Coordinator/ApplicationController.php',
    __DIR__.'/app/Http/Controllers/Admin/ApplicationController.php',
];

foreach ($files as $file) {
    if (file_exists($file)) {
        echo "   ✓ Found: ".basename(dirname($file))."/".basename($file)."\n";
    } else {
        echo "   ✗ Missing: $file\n";
    }
}

// Step 4: Clear caches (if Laravel is available)
echo "\n4. Clearing Laravel caches...\n";

if (file_exists(__DIR__.'/vendor/autoload.php')) {
    require __DIR__.'/vendor/autoload.php';
    
    try {
        $app = require_once __DIR__.'/bootstrap/app.php';
        $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
        
        $commands = [
            'optimize:clear',
            'route:clear',
            'config:clear',
            'cache:clear',
            'view:clear',
        ];
        
        foreach ($commands as $command) {
            try {
                Artisan::call($command);
                echo "   ✓ Cleared: $command\n";
            } catch (Exception $e) {
                echo "   ✗ Failed: $command - ".$e->getMessage()."\n";
            }
        }
        
        // Regenerate autoloader
        echo "\n5. Regenerating Composer autoloader...\n";
        exec('composer dump-autoload 2>&1', $output, $returnCode);
        if ($returnCode === 0) {
            echo "   ✓ Autoloader regenerated\n";
        } else {
            echo "   ✗ Failed to regenerate autoloader\n";
            echo "   Output: ".implode("\n   ", $output)."\n";
        }
        
    } catch (Exception $e) {
        echo "   ⚠ Could not bootstrap Laravel: ".$e->getMessage()."\n";
        echo "   Please run cache clearing commands manually:\n";
        echo "   php artisan optimize:clear\n";
        echo "   php artisan route:clear\n";
        echo "   composer dump-autoload\n";
    }
} else {
    echo "   ⚠ Laravel not found. Please run cache clearing commands manually.\n";
}

// Step 5: Check for compiled route files
echo "\n6. Checking for compiled route files...\n";
$compiledRoutes = [
    __DIR__.'/bootstrap/cache/routes-v7.php',
    __DIR__.'/bootstrap/cache/routes.php',
];

foreach ($compiledRoutes as $file) {
    if (file_exists($file)) {
        echo "   ⚠ Found compiled route file: ".basename($file)."\n";
        echo "   Deleting: ".basename($file)."\n";
        unlink($file);
        echo "   ✓ Deleted\n";
    }
}

echo "\n=== Verification Complete ===\n";
echo "\nIf issues persist:\n";
echo "1. Restart PHP-FPM: sudo service php-fpm restart\n";
echo "2. Restart web server: sudo service apache2 restart (or nginx)\n";
echo "3. Clear OPcache: php -r 'opcache_reset();'\n";
echo "\n";

