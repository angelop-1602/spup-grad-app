<?php

namespace Database\Seeders;

use App\Models\Coordinator;
use App\Models\Department;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CoordinatorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Common password for all coordinators (they can change it later)
        $defaultPassword = 'coordinator123';

        // Coordinator data: username, name, department
        $coordinators = [
            [
                'username' => 'a.julian',
                'name' => 'Angeline D. Julian',
                'department' => 'Graduate School(Doctoral)',
            ],
            [
                'username' => 'd.liban',
                'name' => 'Diana Rose B. Liban',
                'department' => 'School of Arts, Sciences and Teacher Education',
            ],
            [
                'username' => 'h.toribio',
                'name' => 'Heidie D. Toribio',
                'department' => 'School of Business, Accountancy and Hospitality Management',
            ],
            [
                'username' => 'j.barasi',
                'name' => 'Jonalyn D. Barasi',
                'department' => 'School of Information Technology and Engineering',
            ],
            [
                'username' => 'j.ginez',
                'name' => 'Jyzel H. Ginez',
                'department' => 'Graduate School(Masters)',
            ],
            [
                'username' => 'j.valiente',
                'name' => 'Jezarene C. Valiente',
                'department' => 'School of Nursing and Allied Health Sciences(Allied)',
            ],
            [
                'username' => 'jc.valiente',
                'name' => 'Jeza C. Valiente',
                'department' => 'Expanded Tertiary Education Equivalency and Accreditation Program',
            ],
            [
                'username' => 'm.duque',
                'name' => 'Maryjane J. Duque',
                'department' => 'School of Nursing and Allied Health Sciences(Nursing)',
            ],
        ];

        foreach ($coordinators as $coordinatorData) {
            // Find the department by name
            $department = Department::where('name', $coordinatorData['department'])->first();

            if (! $department) {
                $this->command->warn("Department '{$coordinatorData['department']}' not found. Skipping coordinator {$coordinatorData['name']}.");
                continue;
            }

            // Create or update coordinator
            $email = $coordinatorData['username'].'@spup.edu.ph';
            $coordinator = Coordinator::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $coordinatorData['name'],
                    'password' => Hash::make($defaultPassword),
                    'email_verified_at' => now(),
                ]
            );

            // Update name if coordinator already exists
            if ($coordinator->wasRecentlyCreated === false) {
                $coordinator->update(['name' => $coordinatorData['name']]);
            }

            // Attach department (sync will handle duplicates)
            $coordinator->departments()->syncWithoutDetaching([$department->id]);

            $this->command->info("Created/Updated coordinator: {$coordinatorData['name']} ({$email}) - Department: {$department->name}");
        }

        $this->command->info('Coordinator seeding completed!');
        $this->command->info("Default password for all coordinators: {$defaultPassword}");
    }
}
