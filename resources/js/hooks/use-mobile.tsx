import { useSyncExternalStore } from 'react';

const MOBILE_BREAKPOINT = 768;
type LegacyMediaQueryList = MediaQueryList & {
    addListener: (callback: (event: MediaQueryListEvent) => void) => void;
    removeListener: (callback: (event: MediaQueryListEvent) => void) => void;
};

function getMediaQueryList() {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return undefined;
    }

    try {
        return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    } catch {
        return undefined;
    }
}

const mql = getMediaQueryList();

function mediaQueryListener(callback: (event: MediaQueryListEvent) => void) {
    if (!mql) {
        return () => {};
    }

    if ('addEventListener' in mql) {
        mql.addEventListener('change', callback);

        return () => {
            mql.removeEventListener('change', callback);
        };
    }

    const legacyQuery = mql as unknown as LegacyMediaQueryList;

    legacyQuery.addListener(callback);

    return () => {
        legacyQuery.removeListener(callback);
    };
}

function isSmallerThanBreakpoint(): boolean {
    return mql?.matches ?? false;
}

function getServerSnapshot(): boolean {
    return false;
}

export function useIsMobile(): boolean {
    return useSyncExternalStore(
        mediaQueryListener,
        isSmallerThanBreakpoint,
        getServerSnapshot,
    );
}
