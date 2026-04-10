<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('guest_application_drafts', function (Blueprint $table) {
            $table->string('tracking_code')->nullable()->after('student_id');
            $table->unique('tracking_code');
        });

        DB::table('guest_application_drafts')
            ->select('id')
            ->orderBy('id')
            ->get()
            ->each(function (object $draft): void {
                do {
                    $trackingCode = 'TRK-'.now()->format('Y').'-'.Str::upper(Str::random(6));
                } while (DB::table('guest_application_drafts')->where('tracking_code', $trackingCode)->exists());

                DB::table('guest_application_drafts')
                    ->where('id', $draft->id)
                    ->update(['tracking_code' => $trackingCode]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guest_application_drafts', function (Blueprint $table) {
            $table->dropUnique(['tracking_code']);
            $table->dropColumn('tracking_code');
        });
    }
};
