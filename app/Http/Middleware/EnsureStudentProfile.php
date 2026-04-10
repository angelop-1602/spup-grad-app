<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStudentProfile
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Check if user has a student profile
        if (! $user->profile) {
            // Allow access to profile edit and update routes
            if ($request->routeIs('profile.edit') || $request->routeIs('profile.update')) {
                return $next($request);
            }

            // Redirect to profile edit if trying to access other routes
            return redirect()->route('profile.edit')
                ->with('warning', 'Please complete your profile before continuing.');
        }

        return $next($request);
    }
}
