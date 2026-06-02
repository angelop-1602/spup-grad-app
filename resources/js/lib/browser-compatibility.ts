export interface EmbeddedBrowserInfo {
    isEmbedded: boolean;
    name: string;
    isAndroid: boolean;
    isIOS: boolean;
}

const embeddedBrowserPatterns = [
    {
        name: 'Messenger',
        pattern:
            /FBAN\/Messenger|MessengerForiOS|FB_IAB\/Messenger|FBMD\/Messenger|MESSENGER/i,
    },
    {
        name: 'Facebook',
        pattern: /FBAN|FBAV|FB_IAB|FBIOS|FB4A|FBSS/i,
    },
    {
        name: 'Instagram',
        pattern: /Instagram/i,
    },
    {
        name: 'TikTok',
        pattern: /TikTok|BytedanceWebview/i,
    },
];

export function detectEmbeddedBrowser(
    userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent,
): EmbeddedBrowserInfo {
    const matchedBrowser = embeddedBrowserPatterns.find(({ pattern }) =>
        pattern.test(userAgent),
    );
    const isAndroidWebView = /;\s*wv[);]/i.test(userAgent);

    return {
        isEmbedded: Boolean(matchedBrowser || isAndroidWebView),
        name:
            matchedBrowser?.name ??
            (isAndroidWebView ? 'Android WebView' : 'Browser'),
        isAndroid: /Android/i.test(userAgent),
        isIOS: /iPhone|iPad|iPod/i.test(userAgent),
    };
}

export function createChromeIntentUrl(targetHref: string): string | null {
    try {
        const target = new URL(
            targetHref,
            typeof window === 'undefined'
                ? 'https://localhost'
                : window.location.href,
        );
        const scheme = target.protocol.replace(':', '');

        if (scheme !== 'http' && scheme !== 'https') {
            return null;
        }

        const targetPath = `${target.host}${target.pathname}${target.search}`;

        return `intent://${targetPath}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(target.href)};end`;
    } catch {
        return null;
    }
}
