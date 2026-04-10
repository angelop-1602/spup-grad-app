<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\BuildsHistoricalGraduationApplicationResponses;
use App\Http\Controllers\Controller;
use App\Models\HistoricalGraduationApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HistoricalApplicationController extends Controller
{
    use BuildsHistoricalGraduationApplicationResponses;

    public function index(Request $request): Response
    {
        return Inertia::render('historical-applications/index', [
            'viewer' => 'admin',
            ...$this->historicalIndexProps($request),
        ]);
    }

    public function show(HistoricalGraduationApplication $historicalApplication): Response
    {
        return Inertia::render('historical-applications/show', [
            'viewer' => 'admin',
            'record' => $this->historicalShowRecord($historicalApplication),
        ]);
    }
}
