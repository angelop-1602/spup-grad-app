export interface ProfilePhotoValue {
    photo_path?: string | null;
    photo_url?: string | null;
}

export function profilePhotoUrl(profile?: ProfilePhotoValue | null) {
    if (!profile) {
        return null;
    }

    if (profile.photo_url) {
        return profile.photo_url;
    }

    const rawPath = profile.photo_path?.trim();

    if (!rawPath) {
        return null;
    }

    if (/^(https?:)?\/\//i.test(rawPath) || rawPath.startsWith('data:')) {
        return rawPath;
    }

    let path = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');

    for (const prefix of ['public/', 'storage/', 'app/public/']) {
        if (path.startsWith(prefix)) {
            path = path.slice(prefix.length);
        }
    }

    const encodedPath = path
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/');

    return `/storage/${encodedPath}`;
}
