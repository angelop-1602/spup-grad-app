import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type DownloadRoute = (params: { application: string }) => { url: string };

interface DownloadFormButtonProps {
    applicationNumber?: string;
    route?: DownloadRoute;
    href?: string;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
    showIcon?: boolean;
    showText?: boolean;
    label?: string;
    children?: React.ReactNode;
}

interface DownloadFormMenuItemProps {
    applicationNumber?: string;
    route?: DownloadRoute;
    href?: string;
    className?: string;
    children?: React.ReactNode;
}

function getDownloadUrl(
    applicationNumber?: string,
    route?: DownloadRoute,
    href?: string,
): string | null {
    if (href) {
        return href;
    }

    if (applicationNumber && route) {
        return route({ application: applicationNumber }).url;
    }

    return null;
}

function useDownloadNavigation() {
    const [isDownloading, setIsDownloading] = useState(false);
    const resetTimer = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (resetTimer.current) {
                window.clearTimeout(resetTimer.current);
            }
        };
    }, []);

    const beginDownload = () => {
        if (resetTimer.current) {
            window.clearTimeout(resetTimer.current);
        }

        setIsDownloading(true);

        resetTimer.current = window.setTimeout(() => {
            setIsDownloading(false);
            resetTimer.current = null;
        }, 1800);
    };

    return { beginDownload, isDownloading };
}

export function DownloadFormButton({
    applicationNumber,
    route,
    href,
    size = 'sm',
    variant = 'outline',
    className = '',
    showIcon = true,
    showText = true,
    label = 'Download PDF',
    children,
}: DownloadFormButtonProps) {
    const downloadUrl = getDownloadUrl(applicationNumber, route, href);
    const { beginDownload, isDownloading } = useDownloadNavigation();
    const content = (
        <>
            {children && !isDownloading ? (
                children
            ) : (
                <>
                    {showIcon &&
                        (isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
                        ) : (
                            <Download className="h-4 w-4 md:mr-2" />
                        ))}
                    {showText && (
                        <span className="hidden md:inline">
                            {isDownloading ? 'Opening...' : label}
                        </span>
                    )}
                </>
            )}
        </>
    );

    if (!downloadUrl) {
        return (
            <Button
                type="button"
                size={size}
                variant={variant}
                className={className}
                disabled
            >
                {content}
            </Button>
        );
    }

    return (
        <Button asChild size={size} variant={variant} className={className}>
            <a
                href={downloadUrl}
                aria-busy={isDownloading}
                aria-disabled={isDownloading}
                onClick={(event) => {
                    if (isDownloading) {
                        event.preventDefault();
                        return;
                    }

                    beginDownload();
                }}
            >
                {content}
            </a>
        </Button>
    );
}

export function DownloadFormMenuItem({
    applicationNumber,
    route,
    href,
    className,
    children,
}: DownloadFormMenuItemProps) {
    const downloadUrl = getDownloadUrl(applicationNumber, route, href);
    const { beginDownload, isDownloading } = useDownloadNavigation();

    if (!downloadUrl || isDownloading) {
        return (
            <DropdownMenuItem
                className={className}
                disabled={!downloadUrl || isDownloading}
            >
                {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Download className="mr-2 h-4 w-4" />
                )}
                {isDownloading ? 'Opening...' : (children ?? 'Download PDF')}
            </DropdownMenuItem>
        );
    }

    return (
        <DropdownMenuItem asChild className={className}>
            <a href={downloadUrl} onClick={beginDownload}>
                <Download className="mr-2 h-4 w-4" />
                {children ?? 'Download PDF'}
            </a>
        </DropdownMenuItem>
    );
}
