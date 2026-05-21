import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

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

function getFilenameFromDisposition(disposition: string | null): string | null {
    if (!disposition) {
        return null;
    }

    const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);

    if (encodedMatch?.[1]) {
        return decodeURIComponent(encodedMatch[1].replace(/["']/g, ''));
    }

    const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);

    return filenameMatch?.[1] ?? null;
}

function fallbackFilename(contentType: string | null): string {
    if (contentType?.includes('pdf')) {
        return 'GraduationApplication.pdf';
    }

    if (contentType?.includes('wordprocessingml')) {
        return 'GraduationApplication.docx';
    }

    return 'GraduationApplication';
}

function useBackgroundDownload(downloadUrl: string | null) {
    const [isDownloading, setIsDownloading] = useState(false);

    const download = async () => {
        if (!downloadUrl || isDownloading) {
            return;
        }

        setIsDownloading(true);

        try {
            const response = await fetch(downloadUrl, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, */*',
                },
            });
            const disposition = response.headers.get('content-disposition');
            const contentType = response.headers.get('content-type');
            const isDownloadResponse =
                Boolean(disposition) ||
                Boolean(contentType?.includes('pdf')) ||
                Boolean(contentType?.includes('wordprocessingml'));

            if (!response.ok || !isDownloadResponse) {
                throw new Error(
                    'The application form could not be downloaded.',
                );
            }

            const blob = await response.blob();
            const objectUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download =
                getFilenameFromDisposition(disposition) ??
                fallbackFilename(contentType);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(objectUrl);
        } catch (error) {
            console.error(error);
            window.alert(
                'The application form could not be downloaded. Please try again.',
            );
        } finally {
            setIsDownloading(false);
        }
    };

    return { download, isDownloading };
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
    const { download, isDownloading } = useBackgroundDownload(downloadUrl);

    return (
        <Button
            type="button"
            size={size}
            variant={variant}
            className={className}
            disabled={!downloadUrl || isDownloading}
            onClick={() => void download()}
        >
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
                            {isDownloading ? 'Preparing...' : label}
                        </span>
                    )}
                </>
            )}
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
    const { download, isDownloading } = useBackgroundDownload(downloadUrl);

    return (
        <DropdownMenuItem
            className={className}
            disabled={!downloadUrl || isDownloading}
            onSelect={(event) => {
                event.preventDefault();
                void download();
            }}
        >
            {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? 'Preparing...' : (children ?? 'Download PDF')}
        </DropdownMenuItem>
    );
}
