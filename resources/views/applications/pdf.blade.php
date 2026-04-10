@php
    $profile = $profile ?? $application->user->profile;
    $requirements = $application->requirements ?? collect();
    $outstandingRequirements = $requirements->where('status', '!=', 'approved');
@endphp

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Graduation Application</title>
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; font-size: 11px; }
        h1, h2, h3 { margin: 0 0 6px 0; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 4px 6px; vertical-align: top; }
        .border { border: 1px solid #000; }
        .border-bottom { border-bottom: 1px solid #000; }
        .border-top { border-top: 1px solid #000; }
        .mb-2 { margin-bottom: 8px; }
        .mb-3 { margin-bottom: 12px; }
        .mb-4 { margin-bottom: 16px; }
        .small { font-size: 10px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .w-50 { width: 50%; }
    </style>
</head>
<body>
    <h1 class="text-center mb-4">Graduation Application Form</h1>

    {{-- Personal Data --}}
    @if($profile)
        <h2 class="mb-2">Personal Data</h2>
        <table class="border mb-3">
            <tr class="border-bottom">
                <td class="w-50">
                    <span class="small bold">FULL NAME</span><br>
                    {{ $profile->first_name }}
                    @if($profile->middle_name) {{ mb_substr($profile->middle_name, 0, 1) }}.@endif
                    {{ $profile->last_name }}
                </td>
                <td class="w-50">
                    <span class="small bold">STUDENT ID</span><br>
                    {{ $application->user->student_id }}
                </td>
            </tr>
            <tr class="border-bottom">
                <td>
                    <span class="small bold">DATE OF BIRTH</span><br>
                    {{ \Carbon\Carbon::parse($profile->date_of_birth)->format('m/d/Y') }}
                </td>
                <td>
                    <span class="small bold">PLACE OF BIRTH</span><br>
                    {{ $profile->place_of_birth }}
                </td>
            </tr>
            <tr class="border-bottom">
                <td>
                    <span class="small bold">SEX</span><br>
                    {{ $profile->sex }}
                </td>
                <td>
                    <span class="small bold">CIVIL STATUS</span><br>
                    {{ $profile->civil_status }}
                </td>
            </tr>
            <tr class="border-bottom">
                <td>
                    <span class="small bold">RELIGION</span><br>
                    {{ $profile->religion ?? 'N/A' }}
                </td>
                <td>
                    <span class="small bold">NATIONALITY</span><br>
                    {{ $profile->nationality }}
                </td>
            </tr>
            <tr class="border-bottom">
                <td>
                    <span class="small bold">CONTACT NUMBER</span><br>
                    {{ $profile->contact_number }}
                </td>
                <td>
                    <span class="small bold">EMAIL</span><br>
                    {{ $application->user->email ?? '' }}
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <span class="small bold">PERMANENT ADDRESS</span><br>
                    {{ $profile->permanent_address }}
                </td>
            </tr>
        </table>
    @endif

    {{-- Program Details --}}
    <h2 class="mb-2">Program Details</h2>
    <table class="border mb-3">
        <tr class="border-bottom">
            <td class="w-50">
                <span class="small bold">COURSE</span><br>
                {{ $application->course->name }}
            </td>
            <td class="w-50">
                <span class="small bold">MAJOR</span><br>
                {{ $application->major ?: 'N/A' }}
            </td>
        </tr>
        <tr class="border-bottom">
            <td>
                <span class="small bold">DEPARTMENT</span><br>
                {{ $application->department->name }}
            </td>
            <td>
                <span class="small bold">GRADUATION APPEARANCE</span><br>
                {{ $application->presence === 'attending' ? 'Attending' : 'Not Attending' }}
            </td>
        </tr>
        <tr class="border-bottom">
            <td>
                <span class="small bold">APPLICATION WINDOW</span><br>
                {{ $application->window->title }}
            </td>
            <td>
                <span class="small bold">WINDOW DATES</span><br>
                {{ \Carbon\Carbon::parse($application->window->start_date)->format('m/d/Y') }}
                –
                {{ \Carbon\Carbon::parse($application->window->end_date)->format('m/d/Y') }}
            </td>
        </tr>
        <tr>
            <td>
                <span class="small bold">STATUS</span><br>
                {{ ucfirst(str_replace('_', ' ', $application->status)) }}
            </td>
            <td>
                <span class="small bold">SUBMITTED AT</span><br>
                {{ \Carbon\Carbon::parse($application->created_at)->format('m/d/Y H:i') }}
            </td>
        </tr>
    </table>

    {{-- Graduate Program (if applicable) --}}
    @php
        $isGraduateProgram =
            str_contains(strtolower($application->department->name), 'graduate') ||
            $application->subject_code ||
            $application->thesis_dissertation_title;
    @endphp

    @if($isGraduateProgram)
        <h2 class="mb-2">Graduate Program Details</h2>
        <table class="border mb-3">
            @if($application->thesis_dissertation_title)
                <tr class="border-bottom">
                    <td>
                        <span class="small bold">THESIS / DISSERTATION TITLE</span><br>
                        {{ $application->thesis_dissertation_title }}
                    </td>
                </tr>
            @endif
            @if($application->thesis_dissertation_adviser)
                <tr>
                    <td>
                        <span class="small bold">ADVISER</span><br>
                        {{ $application->thesis_dissertation_adviser }}
                    </td>
                </tr>
            @endif
        </table>
    @endif

    {{-- Requirements --}}
    <h2 class="mb-2">Requirements Checklist</h2>
    <table class="border mb-4">
        <tr class="border-bottom bold">
            <td style="width: 10%;">Req #</td>
            <td style="width: 70%;">Requirement</td>
            <td style="width: 20%;">Status</td>
        </tr>
        @foreach($requirements as $index => $req)
            <tr class="border-bottom">
                <td class="text-center">&lt;{{ $index + 1 }}&gt;</td>
                <td>{{ $req->requirement_label }}</td>
                <td class="text-center">
                    @if($req->status === 'approved')
                        Completed
                    @elseif($req->status === 'incomplete')
                        Incomplete
                    @elseif($req->status === 'rejected')
                        Rejected
                    @else
                        Pending
                    @endif
                </td>
            </tr>
        @endforeach
    </table>

    @if($outstandingRequirements->count() > 0)
        <p class="small">
            <span class="bold">Outstanding Requirements:</span>
            {{ $outstandingRequirements->pluck('requirement_label')->join('; ') }}.
        </p>
    @else
        <p class="small">
            <span class="bold">Outstanding Requirements:</span> None – all listed requirements are completed.
        </p>
    @endif
</body>
</html>


