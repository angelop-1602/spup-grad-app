import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/SPUP-Logo-with-yellow.png"
            alt="St. Paul University Philippines"
            {...props}
        />
    );
}
