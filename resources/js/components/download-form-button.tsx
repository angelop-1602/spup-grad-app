import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface DownloadFormButtonProps {
    applicationNumber: string;
    route: (params: { application: string }) => { url: string };
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
    showIcon?: boolean;
    showText?: boolean;
    children?: React.ReactNode;
}

export function DownloadFormButton({
    applicationNumber,
    route,
    size = 'sm',
    variant = 'outline',
    className = '',
    showIcon = true,
    showText = true,
    children,
}: DownloadFormButtonProps) {
    const downloadUrl = route({ application: applicationNumber }).url;
    
    return (
        <Button asChild size={size} variant={variant} className={className}>
            <a
                href={downloadUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
            >
                {children || (
                    <>
                        {showIcon && <Download className="h-4 w-4 md:mr-2" />}
                        {showText && <span className="hidden md:inline">Download DOCX</span>}
                    </>
                )}
            </a>
        </Button>
    );
}

