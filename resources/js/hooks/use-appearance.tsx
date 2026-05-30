import { safeLocalStorage } from '@/lib/browser-storage';
import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';
type LegacyMediaQueryList = MediaQueryList & {
    addListener: (callback: (event: MediaQueryListEvent) => void) => void;
    removeListener: (callback: (event: MediaQueryListEvent) => void) => void;
};

const prefersDark = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return false;
    }

    try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
        return false;
    }
};

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (appearance: Appearance) => {
    const isDark =
        appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

const mediaQuery = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return null;
    }

    try {
        return window.matchMedia('(prefers-color-scheme: dark)');
    } catch {
        return null;
    }
};

const listenToMediaQuery = (
    query: MediaQueryList | null,
    callback: (event: MediaQueryListEvent) => void,
) => {
    if (!query) {
        return () => {};
    }

    if ('addEventListener' in query) {
        query.addEventListener('change', callback);

        return () => query.removeEventListener('change', callback);
    }

    const legacyQuery = query as unknown as LegacyMediaQueryList;

    legacyQuery.addListener(callback);

    return () => legacyQuery.removeListener(callback);
};

const handleSystemThemeChange = () => {
    const currentAppearance = safeLocalStorage.getItem(
        'appearance',
    ) as Appearance | null;
    applyTheme(currentAppearance || 'system');
};

export function initializeTheme() {
    const savedAppearance =
        (safeLocalStorage.getItem('appearance') as Appearance | null) ||
        'system';

    applyTheme(savedAppearance);

    listenToMediaQuery(mediaQuery(), handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    const updateAppearance = useCallback((mode: Appearance) => {
        setAppearance(mode);

        // Store in localStorage for client-side persistence...
        safeLocalStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);
    }, []);

    useEffect(() => {
        const savedAppearance = safeLocalStorage.getItem(
            'appearance',
        ) as Appearance | null;

        // eslint-disable-next-line react-hooks/set-state-in-effect
        updateAppearance(savedAppearance || 'system');

        return listenToMediaQuery(mediaQuery(), handleSystemThemeChange);
    }, [updateAppearance]);

    return { appearance, updateAppearance } as const;
}
