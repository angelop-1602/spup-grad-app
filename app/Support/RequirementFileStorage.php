<?php

namespace App\Support;

use App\Models\ApplicationRequirement;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RequirementFileStorage
{
    private const DIRECTORY = 'requirement-files';

    private const PRIVATE_DISK = 'local';

    private const LEGACY_PUBLIC_DISK = 'public';

    public function store(UploadedFile $file): string
    {
        return $file->store(self::DIRECTORY, self::PRIVATE_DISK);
    }

    public function delete(?string $path): void
    {
        $path = $this->normalizePath($path);

        if (! $path) {
            return;
        }

        foreach ([self::PRIVATE_DISK, self::LEGACY_PUBLIC_DISK] as $diskName) {
            $disk = Storage::disk($diskName);

            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        }
    }

    public function response(ApplicationRequirement $requirement, Request $request): BinaryFileResponse
    {
        $path = $this->normalizePath($requirement->file_path);
        $absolutePath = $path ? $this->absolutePath($path) : null;

        if (! $absolutePath) {
            abort(404, 'Requirement file not found.');
        }

        $fileName = $this->downloadFileName($requirement, $path);

        if ($request->boolean('download')) {
            return response()->download($absolutePath, $fileName);
        }

        return response()->file($absolutePath, [
            'Content-Type' => File::mimeType($absolutePath) ?: 'application/octet-stream',
            'Content-Disposition' => 'inline; filename="'.$fileName.'"',
            'Cache-Control' => 'private, no-store, no-cache, must-revalidate',
        ]);
    }

    public function isRequirementPath(?string $path): bool
    {
        return $this->normalizePath($path) !== null;
    }

    private function normalizePath(?string $path): ?string
    {
        $path = trim(str_replace('\\', '/', (string) $path));
        $path = ltrim($path, '/');

        if ($path === '' || str_contains($path, '../') || str_contains($path, '/..')) {
            return null;
        }

        return Str::startsWith($path, self::DIRECTORY.'/') ? $path : null;
    }

    private function absolutePath(string $path): ?string
    {
        $privateDisk = Storage::disk(self::PRIVATE_DISK);

        if ($privateDisk->exists($path)) {
            return $privateDisk->path($path);
        }

        $legacyPublicDisk = Storage::disk(self::LEGACY_PUBLIC_DISK);

        if ($legacyPublicDisk->exists($path)) {
            return $legacyPublicDisk->path($path);
        }

        return null;
    }

    private function downloadFileName(ApplicationRequirement $requirement, string $path): string
    {
        $extension = pathinfo($path, PATHINFO_EXTENSION);
        $baseName = Str::slug($requirement->requirement_label) ?: 'requirement-file';

        if ($extension !== '') {
            $baseName .= '.'.$extension;
        }

        return str_replace('"', '', $baseName);
    }
}
