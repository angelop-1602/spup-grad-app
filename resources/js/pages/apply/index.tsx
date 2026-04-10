import { ApplicationWizard, type ApplicationWindow, type Department } from '@/components/application-wizard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import ApplyLayout from '@/layouts/apply-layout';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';

interface ApplyPageProps {
    currentWindow: ApplicationWindow | null;
    canApply: boolean;
    departments: Department[];
}

export default function ApplyIndex({ currentWindow, canApply, departments }: ApplyPageProps) {
    return (
        <ApplyLayout>
            <Head title="Apply for Graduation" />

            {!canApply || !currentWindow ? (
                <div className="mx-auto max-w-2xl">
                    <Alert variant="destructive" className="border-red-500/80 bg-red-950/40 text-red-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Application window is closed</AlertTitle>
                        <AlertDescription className="space-y-3">
                            <p>
                                There is currently no active graduation application window. Please check back later or contact the Registrar&apos;s Office for guidance.
                            </p>
                            <Button asChild variant="secondary" className="w-full sm:w-auto">
                                <Link href="/">Return home</Link>
                            </Button>
                        </AlertDescription>
                    </Alert>
                </div>
            ) : (
                <ApplicationWizard
                    mode="guest"
                    window={currentWindow}
                    profile={null}
                    departments={departments}
                />
            )}
        </ApplyLayout>
    );
}
