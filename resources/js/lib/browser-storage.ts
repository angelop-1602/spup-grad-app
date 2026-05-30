type StorageKind = 'localStorage' | 'sessionStorage';

function storage(kind: StorageKind): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window[kind];
    } catch {
        return null;
    }
}

function getItem(kind: StorageKind, key: string): string | null {
    try {
        return storage(kind)?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

function setItem(kind: StorageKind, key: string, value: string): boolean {
    try {
        storage(kind)?.setItem(key, value);

        return true;
    } catch {
        return false;
    }
}

function removeItem(kind: StorageKind, key: string): void {
    try {
        storage(kind)?.removeItem(key);
    } catch {
        // Storage can be unavailable in private or locked-down browser modes.
    }
}

export const safeLocalStorage = {
    getItem: (key: string) => getItem('localStorage', key),
    setItem: (key: string, value: string) =>
        setItem('localStorage', key, value),
    removeItem: (key: string) => removeItem('localStorage', key),
};

export const safeSessionStorage = {
    getItem: (key: string) => getItem('sessionStorage', key),
    setItem: (key: string, value: string) =>
        setItem('sessionStorage', key, value),
    removeItem: (key: string) => removeItem('sessionStorage', key),
};
