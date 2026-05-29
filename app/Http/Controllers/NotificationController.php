<?php

namespace App\Http\Controllers;

use App\Support\NotificationCenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request, NotificationCenter $notifications): JsonResponse
    {
        return response()->json($notifications->payloadFor($this->notifiable($request)));
    }

    public function markAsRead(Request $request, NotificationCenter $notifications, string $notification): JsonResponse
    {
        $notifiable = $this->notifiable($request);

        $notifications->markAsRead($notifiable, $notification);

        return response()->json($notifications->payloadFor($notifiable));
    }

    public function markAllAsRead(Request $request, NotificationCenter $notifications): JsonResponse
    {
        $notifiable = $this->notifiable($request);

        $notifications->markAllAsRead($notifiable);

        return response()->json($notifications->payloadFor($notifiable));
    }

    private function notifiable(Request $request): object
    {
        return $request->user('admin')
            ?? $request->user('coordinator')
            ?? abort(403);
    }
}
