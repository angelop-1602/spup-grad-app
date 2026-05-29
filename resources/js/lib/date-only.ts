export interface DateOnlyParts {
    day: number;
    month: number;
    year: number;
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseDateOnly(
    value: string | null | undefined,
): DateOnlyParts | null {
    if (!value) {
        return null;
    }

    const match = value.trim().match(DATE_ONLY_PATTERN);

    if (!match) {
        return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);

    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month - 1 ||
        date.getDate() !== day
    ) {
        return null;
    }

    return { day, month, year };
}

export function toDateOnlyString(
    year: number,
    month: number,
    day: number,
): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDateOnly(value: string | null | undefined): string {
    const parts = parseDateOnly(value);

    if (!parts) {
        return value ?? '';
    }

    return new Date(
        parts.year,
        parts.month - 1,
        parts.day,
    ).toLocaleDateString();
}
