<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Application Window Statistics - {{ $window->title }}</title>
    <style>
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 10px;
            margin: 0;
            padding: 15px;
        }
        h1 {
            font-size: 18px;
            margin: 0 0 8px 0;
            text-align: center;
            font-weight: bold;
        }
        h2 {
            font-size: 14px;
            margin: 12px 0 6px 0;
            font-weight: bold;
            border-bottom: 2px solid #000;
            padding-bottom: 3px;
        }
        h3 {
            font-size: 12px;
            margin: 10px 0 4px 0;
            font-weight: bold;
        }
        h4 {
            font-size: 11px;
            margin: 8px 0 3px 0;
            font-weight: bold;
        }
        .summary {
            margin-bottom: 15px;
            padding: 8px;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
        }
        .dept-section {
            margin-bottom: 15px;
            padding: 8px;
            border: 1px solid #ccc;
            page-break-inside: avoid;
        }
        .dept-header {
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 1px solid #999;
        }
        .dept-stats {
            margin: 6px 0;
            padding: 6px;
            background-color: #f9f9f9;
        }
        .stat-row {
            margin: 3px 0;
            font-size: 9px;
        }
        .program-item {
            margin: 8px 0 8px 15px;
            padding: 6px;
            border-left: 2px solid #999;
            padding-left: 8px;
        }
        .major-item {
            margin: 4px 0 4px 30px;
            padding: 4px;
            font-size: 9px;
            border-left: 1px solid #ccc;
            padding-left: 6px;
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
            margin: 0 3px;
        }
        .badge-green {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .badge-red {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .badge-blue {
            background-color: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
        .nationality-list {
            margin-top: 4px;
            font-size: 9px;
        }
        .nationality-item {
            display: inline-block;
            margin: 2px 4px 2px 0;
            padding: 1px 4px;
            border: 1px solid #ddd;
            border-radius: 2px;
        }
        .text-bold {
            font-weight: bold;
        }
        .page-break {
            page-break-after: always;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 6px 0;
        }
        table td, table th {
            padding: 4px;
            border: 1px solid #ddd;
            font-size: 9px;
        }
        table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Application Window Statistics</h1>
    <div class="summary">
        <div class="summary-row">
            <span class="text-bold">Window:</span>
            <span>{{ $window->title }}</span>
        </div>
        <div class="summary-row">
            <span class="text-bold">Period:</span>
            <span>{{ \Carbon\Carbon::parse($window->start_date)->format('M d, Y') }} - {{ \Carbon\Carbon::parse($window->end_date)->format('M d, Y') }}</span>
        </div>
        <div class="summary-row">
            <span class="text-bold">Total Applications:</span>
            <span>{{ $totalApplications }}</span>
        </div>
        <div class="summary-row">
            <span class="text-bold">Overall Attendance:</span>
            <span>
                <span class="badge badge-green">Attending: {{ $attendance['attending'] }}</span>
                <span class="badge badge-red">Not Attending: {{ $attendance['not_attending'] }}</span>
            </span>
        </div>
    </div>

    <h2>Breakdown by Department, Program & Major</h2>

    @forelse($hierarchical as $dept)
        <div class="dept-section">
            <div class="dept-header">
                {{ $dept['name'] }} - Total: {{ $dept['total'] }}
            </div>

            <div class="dept-stats">
                <div class="stat-row">
                    <span class="text-bold">Attendance:</span>
                    <span class="badge badge-green">Attending: {{ $dept['attendance']['attending'] }}</span>
                    <span class="badge badge-red">Not Attending: {{ $dept['attendance']['not_attending'] }}</span>
                </div>
                @if(!empty($dept['nationalities']))
                    <div class="stat-row">
                        <span class="text-bold">Nationalities:</span>
                        <span class="nationality-list">
                            @foreach($dept['nationalities'] as $nat)
                                <span class="nationality-item">{{ $nat['nationality'] }}: {{ $nat['count'] }}</span>
                            @endforeach
                        </span>
                    </div>
                @endif
            </div>

            @if(!empty($dept['programs']))
                @foreach($dept['programs'] as $program)
                    <div class="program-item">
                        <h3>{{ $program['name'] }} - Total: {{ $program['total'] }}</h3>
                        <div class="stat-row">
                            <span class="text-bold">Attendance:</span>
                            <span class="badge badge-green">Attending: {{ $program['attendance']['attending'] }}</span>
                            <span class="badge badge-red">Not Attending: {{ $program['attendance']['not_attending'] }}</span>
                        </div>
                        @if(!empty($program['nationalities']))
                            <div class="stat-row">
                                <span class="text-bold">Nationalities:</span>
                                <span class="nationality-list">
                                    @foreach($program['nationalities'] as $nat)
                                        <span class="nationality-item">{{ $nat['nationality'] }}: {{ $nat['count'] }}</span>
                                    @endforeach
                                </span>
                            </div>
                        @endif

                        @if(!empty($program['majors']) && count(array_filter($program['majors'], fn($m) => $m['name'] !== 'N/A')) > 0)
                            @foreach($program['majors'] as $major)
                                @if($major['name'] !== 'N/A')
                                    <div class="major-item">
                                        <h4>{{ $major['name'] }} - Total: {{ $major['total'] }}</h4>
                                        <div class="stat-row">
                                            <span>Attending: {{ $major['attendance']['attending'] }}</span> |
                                            <span>Not Attending: {{ $major['attendance']['not_attending'] }}</span>
                                            @if(!empty($major['nationalities']))
                                                | <span>
                                                    @foreach($major['nationalities'] as $nat)
                                                        {{ $nat['nationality'] }}({{ $nat['count'] }})@if(!$loop->last), @endif
                                                    @endforeach
                                                </span>
                                            @endif
                                        </div>
                                    </div>
                                @endif
                            @endforeach
                        @endif
                    </div>
                @endforeach
            @endif
        </div>
    @empty
        <p>No data available.</p>
    @endforelse

    <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 9px; text-align: center; color: #666;">
        Generated on {{ now()->format('F d, Y \a\t h:i A') }}
    </div>
</body>
</html>

