/**
 * Formats a person's name for display in the UI.
 * Format: "FirstName M. LastName" (middle initial with period)
 *
 * @param firstName - First name
 * @param lastName - Last name
 * @param middleName - Middle name (optional)
 * @returns Formatted name string
 */
export function formatName(
    firstName: string | null | undefined,
    lastName: string | null | undefined,
    middleName?: string | null | undefined,
    suffix?: string | null | undefined,
): string {
    const parts: string[] = [];

    // Add first name
    if (firstName) {
        parts.push(firstName);
    }

    // Add middle initial (first letter with period)
    if (middleName && middleName.trim()) {
        const middleInitial = middleName.trim().charAt(0).toUpperCase();
        if (middleInitial) {
            parts.push(`${middleInitial}.`);
        }
    }

    // Add last name
    if (lastName) {
        parts.push(lastName);
    }

    if (suffix && suffix.trim()) {
        parts.push(suffix.trim());
    }

    return parts.length > 0 ? parts.join(' ') : 'N/A';
}

