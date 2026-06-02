import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import { useClipboard } from '@/hooks/use-clipboard';
import {
    createChromeIntentUrl,
    detectEmbeddedBrowser,
    type EmbeddedBrowserInfo,
} from '@/lib/browser-compatibility';
import { safeSessionStorage } from '@/lib/browser-storage';
import { ExternalLink, LinkIcon, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const DISMISS_KEY = 'embedded-browser-notice-dismissed';

export function EmbeddedBrowserNotice() {
    const { addToast } = useToast();
    const [, copy] = useClipboard();
    const [browserInfo, setBrowserInfo] = useState<EmbeddedBrowserInfo | null>(
        null,
    );
    const [pageUrl, setPageUrl] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const detected = detectEmbeddedBrowser();

        if (!detected.isEmbedded || safeSessionStorage.getItem(DISMISS_KEY)) {
            return;
        }

        setBrowserInfo(detected);
        setPageUrl(window.location.href);
    }, []);

    const chromeIntentUrl = useMemo(() => {
        if (!browserInfo?.isAndroid || !pageUrl) {
            return null;
        }

        return createChromeIntentUrl(pageUrl);
    }, [browserInfo?.isAndroid, pageUrl]);

    const dismiss = () => {
        safeSessionStorage.setItem(DISMISS_KEY, '1');
        setBrowserInfo(null);
    };

    const copyPageLink = async () => {
        const copied = await copy(pageUrl);

        addToast({
            variant: copied ? 'success' : 'warning',
            title: copied ? 'Link copied' : 'Copy failed',
            description: copied
                ? 'Open Chrome or Safari, paste the link, then try the download again.'
                : 'Use the browser menu to copy this page link, then open it in Chrome or Safari.',
        });
    };

    if (!browserInfo) {
        return null;
    }

    return (
        <aside
            className="pointer-events-none fixed inset-x-3 bottom-20 z-[90] flex justify-start sm:inset-x-auto sm:bottom-4 sm:left-4"
            aria-live="polite"
        >
            <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3 rounded-lg border bg-background/95 p-3 text-foreground shadow-lg backdrop-blur sm:w-[26rem] sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                        Opened in {browserInfo.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Some downloads may not start inside app browsers. Open
                        this page in your phone browser, then try the download
                        again.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {chromeIntentUrl ? (
                        <Button asChild size="sm">
                            <a href={chromeIntentUrl}>
                                <ExternalLink className="size-4" />
                                Chrome
                            </a>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void copyPageLink()}
                        >
                            <LinkIcon className="size-4" />
                            Copy link
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        onClick={dismiss}
                        aria-label="Dismiss browser compatibility notice"
                    >
                        <X className="size-4" />
                    </Button>
                </div>
            </div>
        </aside>
    );
}
