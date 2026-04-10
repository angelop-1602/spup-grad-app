<?php

namespace App\Http\Middleware;

use App\Models\Application;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class EnsureGuestApplicationAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Application|string|null $application */
        $application = $request->route('application');
        $applicationId = $application instanceof Application ? $application->id : null;

        $allowedIds = $request->session()->get('guest_application_access', []);
        if ($applicationId && in_array($applicationId, $allowedIds, true)) {
            return $next($request);
        }

        if ($applicationId === null) {
            return $next($request);
        }

        /** @var RedirectResponse $response */
        $response = redirect()
            ->route('apply.index')
            ->with('error', 'This guest application link has expired. Please request a fresh access link.');

        return $response;
    }
}
