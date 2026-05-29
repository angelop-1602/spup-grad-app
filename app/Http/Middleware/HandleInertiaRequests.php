<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Support\NotificationCenter;
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

        $notificationPayload = [
            'notifications' => collect(),
            'unreadNotificationCount' => 0,
        ];

        if ($admin || $coordinator) {
            $notificationPayload = app(NotificationCenter::class)->payloadFor($admin ?? $coordinator);
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
            'notifications' => $notificationPayload['notifications'],
            'unreadNotificationCount' => $notificationPayload['unreadNotificationCount'],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
