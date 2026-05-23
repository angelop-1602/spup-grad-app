<?php

namespace App\Http\Middleware;

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        $admin = $request->user('admin');
        $coordinator = $request->user('coordinator');
        $developer = $request->user('developer');

        // Load profile relationship for avatar access (only for student users)
        if ($user instanceof User) {
            $user->load('profile');
        }

        // Get notifications for admin or coordinator
        $notifications = collect();
        $unreadNotificationCount = 0;

        if ($admin) {
            // Get all unread notifications to count per application
            $allUnreadNotifications = $admin->unreadNotifications()
                ->where('type', 'App\Notifications\RequirementFileUploaded')
                ->get();

            // Count notifications per application
            $countsByApplication = $allUnreadNotifications->groupBy(function ($notification) {
                return $notification->data['application_number'] ?? '';
            })->map->count();

            $notifications = $allUnreadNotifications
                ->sortByDesc('created_at')
                ->map(function ($notification) use ($countsByApplication) {
                    $data = $notification->data;
                    $applicationNumber = $data['application_number'] ?? '';

                    return [
                        'id' => $notification->id,
                        'student_name' => $data['student_name'] ?? 'Unknown',
                        'student_avatar' => $data['student_avatar'] ?? null,
                        'requirement_label' => $data['requirement_label'] ?? 'Requirement',
                        'application_number' => $applicationNumber,
                        'upload_count' => $countsByApplication[$applicationNumber] ?? 1,
                        'created_at' => $notification->created_at->toIso8601String(),
                    ];
                });
            $unreadNotificationCount = $allUnreadNotifications->count();
        } elseif ($coordinator) {
            // Get all unread notifications to count per application
            $allUnreadNotifications = $coordinator->unreadNotifications()
                ->where('type', 'App\Notifications\RequirementFileUploaded')
                ->get();

            // Count notifications per application
            $countsByApplication = $allUnreadNotifications->groupBy(function ($notification) {
                return $notification->data['application_number'] ?? '';
            })->map->count();

            $notifications = $allUnreadNotifications
                ->sortByDesc('created_at')
                ->map(function ($notification) use ($countsByApplication) {
                    $data = $notification->data;
                    $applicationNumber = $data['application_number'] ?? '';

                    return [
                        'id' => $notification->id,
                        'student_name' => $data['student_name'] ?? 'Unknown',
                        'student_avatar' => $data['student_avatar'] ?? null,
                        'requirement_label' => $data['requirement_label'] ?? 'Requirement',
                        'application_number' => $applicationNumber,
                        'upload_count' => $countsByApplication[$applicationNumber] ?? 1,
                        'created_at' => $notification->created_at->toIso8601String(),
                    ];
                });
            $unreadNotificationCount = $allUnreadNotifications->count();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'version' => config('app.version'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
                'admin' => $admin,
                'coordinator' => $coordinator,
                'developer' => $developer,
            ],
            'notifications' => $notifications,
            'unreadNotificationCount' => $unreadNotificationCount,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
