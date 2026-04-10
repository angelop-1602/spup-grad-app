import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationSummaryProps {
    errors: Record<string, string | string[] | undefined>;
    title?: string;
    className?: string;
}

/**
 * Displays a summary of all validation errors in a user-friendly format.
 * Groups errors by field and shows which fields need to be updated.
 */
export default function ValidationSummary({
    errors,
    title = 'Please fix the following errors:',
    className,
}: ValidationSummaryProps) {
    // Filter out empty errors and flatten arrays
    const errorEntries = Object.entries(errors).filter(([, value]) => {
        if (Array.isArray(value)) {
            return value.length > 0 && value.some((v) => v && typeof v === 'string' && v.trim() !== '');
        }
        return value && typeof value === 'string' && value.trim() !== '';
    });

    if (errorEntries.length === 0) {
        return null;
    }

    // Helper function to format field names
    const formatFieldName = (field: string): string => {
        // Replace underscores with spaces and capitalize words
        return field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase())
            // Handle special cases
            .replace(/Shs/g, 'SHS')
            .replace(/Jhs/g, 'JHS')
            .replace(/Dob/g, 'Date of Birth')
            .replace(/Id/g, 'ID');
    };

    return (
        <Alert variant="destructive" className={cn('mb-4', className)}>
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                    {errorEntries.map(([field, value]) => {
                        const fieldName = formatFieldName(field);
                        if (Array.isArray(value)) {
                            return value
                                .filter((v) => v && typeof v === 'string' && v.trim() !== '')
                                .map((error, index) => (
                                    <li key={`${field}-${index}`}>
                                        <strong>{fieldName}:</strong> {error}
                                    </li>
                                ));
                        }
                        return (
                            <li key={field}>
                                <strong>{fieldName}:</strong> {value}
                            </li>
                        );
                    })}
                </ul>
            </AlertDescription>
        </Alert>
    );
}

