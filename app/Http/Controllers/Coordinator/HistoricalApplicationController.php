<?php

namespace App\Http\Controllers\Coordinator;

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
            'viewer' => 'coordinator',
            ...$this->historicalIndexProps($request),
        ]);
    }

    public function show(HistoricalGraduationApplication $historicalApplication): Response
    {
        return Inertia::render('historical-applications/show', [
            'viewer' => 'coordinator',
            'record' => $this->historicalShowRecord($historicalApplication),
        ]);
    }
}
