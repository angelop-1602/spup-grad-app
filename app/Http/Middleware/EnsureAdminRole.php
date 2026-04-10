<?php

namespace App\Http\Middleware;

use App\AdminRole;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $admin = Auth::guard('admin')->user();

        if (! $admin) {
            abort(403, 'Unauthorized');
        }

        $allowedRoles = array_map(fn (string $role) => AdminRole::from($role), $roles);

        if (! in_array($admin->role, $allowedRoles, true)) {
            abort(403, 'Insufficient permissions');
        }

        return $next($request);
    }
}

