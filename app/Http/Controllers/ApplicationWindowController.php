<?php

namespace App\Http\Controllers;

use App\Models\ApplicationWindow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationWindowController extends Controller
{
    /**
     * Get the current active application window.
     */
    public function current(Request $request): JsonResponse
    {
        $now = now();

        // First, try to get an active window
        $window = ApplicationWindow::current();

        // If no active window, try to get the next upcoming window
        if (! $window) {
            $window = ApplicationWindow::query()
                ->where('start_date', '>', $now)
                ->orderBy('start_date', 'asc')
                ->first();
        }

        // If still no window, try to get the most recent window (even if ended)
        if (! $window) {
            $window = ApplicationWindow::query()
                ->orderBy('end_date', 'desc')
                ->first();
        }

        if (! $window) {
            return response()->json([
                'window' => null,
                'status' => 'closed',
            ]);
        }

        // Determine status with detailed comparison (inclusive of entire end date)
        $endDate = $window->end_date->copy()->endOfDay();
        if ($now->lt($window->start_date)) {
            $status = 'upcoming';
        } elseif ($now->gt($endDate)) {
            $status = 'closed';
        } else {
            $status = 'active';
        }

        return response()->json([
            'window' => [
                'id' => $window->id,
                'title' => $window->title,
                'description' => $window->description,
                'start_date' => $window->start_date->toIso8601String(),
                'end_date' => $window->end_date->toIso8601String(),
            ],
            'status' => $status,
            'now' => $now->toIso8601String(),
            'debug' => [
                'is_currently_active' => $window->isCurrentlyActive(),
                'now_vs_start' => $now->gte($window->start_date) ? 'now >= start' : 'now < start',
                'now_vs_end' => $now->lte($window->end_date) ? 'now <= end' : 'now > end',
                'timezone' => config('app.timezone'),
            ],
        ]);
    }
}
