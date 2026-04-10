<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('guest_application_drafts', function (Blueprint $table) {
            $table->string('tracking_pin', 6)->nullable()->after('tracking_code');
        });

        DB::table('guest_application_drafts')
            ->select('id')
            ->whereNull('tracking_pin')
            ->orderBy('id')
            ->get()
            ->each(function (object $draft): void {
                DB::table('guest_application_drafts')
                    ->where('id', $draft->id)
                    ->update([
                        'tracking_pin' => str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT),
                    ]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('guest_application_drafts', function (Blueprint $table) {
            $table->dropColumn('tracking_pin');
        });
    }
};
