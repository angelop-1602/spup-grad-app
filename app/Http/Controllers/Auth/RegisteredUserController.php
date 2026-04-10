<?php

namespace App\Http\Controllers\Auth;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration view.
     *
     * @return mixed
     */
    public function create()
    {
        return redirect()->route('apply.index')
            ->with('info', 'Student account registration is no longer used. Please complete your application through the public portal.');
    }

    /**
     * Create a new registered user.
     *
     * @return mixed
     */
    public function store(Request $request)
    {
        return redirect()->route('apply.index')
            ->with('info', 'Student account registration is no longer available. Please use the public application portal instead.');
    }
}
