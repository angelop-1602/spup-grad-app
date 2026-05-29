<?php

use App\Http\Middleware\EnsureRoleAccess;
use App\Http\Middleware\RedirectIfStaffAuthenticated;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

// Storage link creation route (for cPanel/manual setup)
Route::get('/setup/storage-link', function () {
    $link = public_path('storage');
    $target = storage_path('app/public');

    // Check if symlink already exists
    if (file_exists($link) && is_link($link)) {
        return response()->json([
            'success' => true,
            'message' => 'Storage symlink already exists.',
            'link' => $link,
            'target' => $target,
        ]);
    }

    // Create target directory if it doesn't exist
    if (! \File::exists($target)) {
        \File::makeDirectory($target, 0755, true);
    }

    // Create subdirectories
    $subdirectories = ['profile-photos', 'requirement-files'];
    foreach ($subdirectories as $subdir) {
        $subdirPath = $target.'/'.$subdir;
        if (! \File::exists($subdirPath)) {
            \File::makeDirectory($subdirPath, 0755, true);
        }
    }

    // Remove if exists but is not a symlink
    if (file_exists($link) && ! is_link($link)) {
        \File::deleteDirectory($link);
    }

    // Try to create symlink
    try {
        if (function_exists('symlink')) {
            symlink($target, $link);

            return response()->json([
                'success' => true,
                'message' => 'Storage symlink created successfully!',
                'link' => $link,
                'target' => $target,
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'symlink() function is not available on this server.',
                'instructions' => 'Please create the symlink manually in cPanel File Manager or via SSH.',
            ], 500);
        }
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to create symlink: '.$e->getMessage(),
            'instructions' => 'Please create the symlink manually. See instructions below.',
            'link_path' => $link,
            'target_path' => $target,
        ], 500);
    }
})->name('setup.storage-link');

// Serve storage files directly (fallback if symlink doesn't work on cPanel)
// This route must be before other routes to catch /storage/* requests
Route::get('storage/{path}', function (string $path) {
    $filePath = storage_path('app/public/'.$path);

    if (! file_exists($filePath) || ! is_file($filePath)) {
        abort(404);
    }

    // Security: prevent directory traversal
    $realPath = realpath($filePath);
    $realBase = realpath(storage_path('app/public'));
    if (! $realPath || strpos($realPath, $realBase) !== 0) {
        abort(404);
    }

    $file = \File::get($filePath);
    $type = \File::mimeType($filePath);

    return response($file, 200)
        ->header('Content-Type', $type)
        ->header('Content-Disposition', 'inline; filename="'.basename($filePath).'"')
        ->header('Cache-Control', 'public, max-age=31536000');
})->where('path', '.*')->name('storage.serve');

// Public application window status (for welcome page countdown)
Route::get('windows/current', [App\Http\Controllers\ApplicationWindowController::class, 'current'])->name('windows.current');

Route::post('/support/issues', [App\Http\Controllers\SupportIssueController::class, 'store'])
    ->middleware([RedirectIfStaffAuthenticated::class, 'throttle:support-issues'])
    ->name('support.issues.store');

// Guest-first graduation application flow
Route::middleware(RedirectIfStaffAuthenticated::class)->group(function () {
    Route::get('/apply', [App\Http\Controllers\GuestApplicationController::class, 'index'])
        ->name('apply.index');
    Route::post('/apply', [App\Http\Controllers\GuestApplicationController::class, 'store'])
        ->name('apply.store');
    Route::post('/apply/track', [App\Http\Controllers\GuestApplicationController::class, 'track'])
        ->middleware(['throttle:guest-application-track'])
        ->name('apply.track');
    Route::post('/apply/track/recover', [App\Http\Controllers\GuestApplicationController::class, 'recoverTracking'])
        ->middleware(['throttle:guest-application-track-recovery'])
        ->name('apply.track.recover');
    Route::get('/apply/drafts/{draft}', [App\Http\Controllers\GuestApplicationController::class, 'pending'])
        ->name('apply.pending.show');
    Route::post('/apply/drafts/{draft}/resend', [App\Http\Controllers\GuestApplicationController::class, 'resend'])
        ->middleware(['throttle:guest-application-resend'])
        ->name('apply.pending.resend');
    Route::post('/apply/drafts/{draft}/change-email', [App\Http\Controllers\GuestApplicationController::class, 'changeEmail'])
        ->name('apply.pending.change-email');
    Route::get('/apply/verify/{draft}/{hash}', [App\Http\Controllers\GuestApplicationController::class, 'verify'])
        ->name('apply.verify');
    Route::get('/apply/access/{draft}', [App\Http\Controllers\GuestApplicationController::class, 'access'])
        ->middleware(['signed'])
        ->name('apply.access');
    Route::middleware([App\Http\Middleware\EnsureGuestApplicationAccess::class])->group(function () {
        Route::get('/apply/application/{application:application_number}', [App\Http\Controllers\GuestApplicationController::class, 'show'])
            ->name('apply.portal.show');
        Route::get('/apply/application/{application:application_number}/download', [App\Http\Controllers\GuestApplicationController::class, 'download'])
            ->name('apply.portal.download');
        Route::get('/apply/application/{application:application_number}/photo/download', [App\Http\Controllers\GuestApplicationController::class, 'downloadPhoto'])
            ->name('apply.portal.photo.download');
        Route::get('/apply/application/{application:application_number}/edit', [App\Http\Controllers\GuestApplicationController::class, 'edit'])
            ->name('apply.portal.edit');
        Route::put('/apply/application/{application:application_number}', [App\Http\Controllers\GuestApplicationController::class, 'update'])
            ->name('apply.portal.update');
        Route::post('/apply/application/{application:application_number}/requirements/{requirement}/upload', [App\Http\Controllers\GuestApplicationController::class, 'uploadRequirement'])
            ->name('apply.portal.upload');
    });
});

Route::middleware([EnsureRoleAccess::class.':web', 'auth'])->group(function () {
    // Student Profile (accessible without profile check)
    Route::get('profile', [App\Http\Controllers\StudentProfileController::class, 'show'])->name('profile.show');
    Route::get('profile/edit', [App\Http\Controllers\StudentProfileController::class, 'edit'])->name('profile.edit');
    Route::put('profile', [App\Http\Controllers\StudentProfileController::class, 'update'])->name('profile.update');

    // Protected routes that require student profile
    Route::middleware([App\Http\Middleware\EnsureStudentProfile::class])->group(function () {
        Route::get('dashboard', [App\Http\Controllers\ApplicationController::class, 'dashboard'])->name('dashboard');

        // Departments
        Route::get('departments', [App\Http\Controllers\DepartmentController::class, 'index'])->name('departments.index');

        // Applications
        Route::resource('applications', App\Http\Controllers\ApplicationController::class)->scoped([
            'application' => 'application_number',
        ]);
        Route::get('applications/{application:application_number}/download', [App\Http\Controllers\ApplicationController::class, 'download'])
            ->name('applications.download');
        Route::get('applications/{application:application_number}/photo/download', [App\Http\Controllers\ApplicationController::class, 'downloadPhoto'])
            ->name('applications.photo.download');
        Route::post('applications/{application:application_number}/requirements/{requirement}/upload', [App\Http\Controllers\ApplicationController::class, 'uploadRequirement'])
            ->name('applications.requirements.upload');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
require __DIR__.'/coordinator.php';
require __DIR__.'/developer.php';
