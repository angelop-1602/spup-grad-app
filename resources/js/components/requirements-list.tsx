import { DownloadFormButton } from '@/components/download-form-button';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import adminRoutes from '@/routes/admin';
import applicationRoutes from '@/routes/applications/index';
import applyRoutes from '@/routes/apply';
import coordinatorRoutes from '@/routes/coordinator';
import {
    CheckCircle2,
    Clock,
    Download,
    Eye,
    FileText,
    MoreVertical,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export interface ApplicationRequirement {
    id: number;
    requirement_key: string;
    requirement_label: string;
    status: 'pending' | 'required' | 'approved';
    notes: string | null;
    file_path: string | null;
    parent_id: number | null;
    children?: ApplicationRequirement[];
}

interface RequirementStatusConfig {
    pending: {
        label: string;
        icon: typeof Clock;
        iconColor: string;
        badgeColor?: string;
        color: string;
    };
    required: {
        label: string;
        icon: typeof Clock;
        iconColor: string;
        badgeColor?: string;
        color: string;
    };
    approved: {
        label: string;
        icon: typeof CheckCircle2;
        iconColor: string;
        badgeColor?: string;
        color: string;
    };
}

interface RequirementData {
    id: number;
    status: ApplicationRequirement['status'];
    notes: string;
}

interface RequirementsListProps {
    requirements: ApplicationRequirement[];
    requirementsData?: RequirementData[]; // For coordinator/admin - current state
    mode: 'student' | 'coordinator' | 'admin';
    portalMode?: 'student' | 'guest';
    onStatusChange?: (
        requirementId: number,
        status: ApplicationRequirement['status'],
    ) => void;
    onNotesChange?: (requirementId: number, notes: string) => void;
    onFileUpload?: (requirementId: number, file: File) => void;
    uploadingRequirement?: number | null;
    applicationNumber?: string;
    showNotesInput?: boolean;
    className?: string;
    showDownloadButton?: boolean; // Show download button when all requirements are approved
}

const requirementStatusConfig: RequirementStatusConfig = {
    pending: {
        label: 'Pending',
        icon: Clock,
        iconColor: 'text-blue-600 dark:text-blue-400',
        badgeColor:
            'text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300',
        color: 'text-blue-500',
    },
    required: {
        label: 'Required',
        icon: Clock,
        iconColor: 'text-gray-600 dark:text-gray-400',
        badgeColor: 'text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-300',
        color: 'text-gray-500',
    },
    approved: {
        label: 'Approved',
        icon: CheckCircle2,
        iconColor: 'text-green-600 dark:text-green-400',
        badgeColor:
            'text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300',
        color: 'text-green-600',
    },
};

export function RequirementsList({
    requirements,
    requirementsData,
    mode,
    portalMode = 'student',
    onStatusChange,
    onNotesChange,
    onFileUpload,
    uploadingRequirement = null,
    applicationNumber,
    showNotesInput = true,
    className = '',
    showDownloadButton = true,
}: RequirementsListProps) {
    // Check if all requirements are approved
    const allRequirementsApproved = useMemo(() => {
        if (!requirements || requirements.length === 0) {
            return false;
        }

        // Check all top-level requirements (excluding children)
        const topLevelRequirements = requirements.filter(
            (req) => !req.parent_id,
        );

        // All top-level requirements must be approved
        return topLevelRequirements.every((req) => {
            // If requirement has children, all children must be approved
            if (req.children && req.children.length > 0) {
                return req.children.every(
                    (child) => child.status === 'approved',
                );
            }
            // Otherwise, the requirement itself must be approved
            return req.status === 'approved';
        });
    }, [requirements]);

    // Get the appropriate route based on mode
    const getDownloadRoute = () => {
        if (mode === 'coordinator') {
            return coordinatorRoutes.applications.download;
        } else if (mode === 'admin') {
            return adminRoutes.applications.download;
        }
        return applicationRoutes.download;
    };
    const [previewFile, setPreviewFile] = useState<{
        path: string;
        name: string;
        url: string;
    } | null>(null);
    const fileInputRefs = useRef<Record<number, HTMLInputElement>>({});
    // Store selected files before upload (for student mode)
    const [selectedFiles, setSelectedFiles] = useState<Record<number, File>>(
        {},
    );

    const isImageFile = (filePath: string): boolean => {
        const extension = filePath.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '');
    };

    const isPdfFile = (filePath: string): boolean => {
        const extension = filePath.split('.').pop()?.toLowerCase();
        return extension === 'pdf';
    };

    const canPreview = (filePath: string): boolean => {
        return isImageFile(filePath) || isPdfFile(filePath);
    };

    const fileName = (filePath: string): string => {
        return filePath.split('/').pop() || 'Document';
    };

    const requirementFileUrl = (
        requirementId: number,
        options?: { download?: boolean },
    ): string | null => {
        if (!applicationNumber) {
            return null;
        }

        const args = {
            application: applicationNumber,
            requirement: requirementId,
        };
        const routeOptions = options?.download
            ? { query: { download: 1 } }
            : undefined;

        if (mode === 'admin') {
            return adminRoutes.applications.requirements.file(
                args,
                routeOptions,
            ).url;
        }

        if (mode === 'coordinator') {
            return coordinatorRoutes.applications.requirements.file(
                args,
                routeOptions,
            ).url;
        }

        if (portalMode === 'guest') {
            return applyRoutes.portal.requirements.file(args, routeOptions).url;
        }

        return applicationRoutes.requirements.file(args, routeOptions).url;
    };

    const isStudent = mode === 'student';

    // Check if there are any required requirements (for showing note in header)
    const hasRequiredRequirements = useMemo(() => {
        if (!isStudent) {
            return false;
        }
        return requirements.some((req) => {
            if (req.status === 'required' && !req.file_path) {
                return true;
            }
            if (req.children) {
                return req.children.some(
                    (child) => child.status === 'required' && !child.file_path,
                );
            }
            return false;
        });
    }, [requirements, isStudent]);

    return (
        <>
            <div className={className}>
                {/* Note in header for student mode */}
                {isStudent && hasRequiredRequirements && (
                    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 md:mb-4 md:p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="text-xs font-medium text-amber-800 md:text-sm dark:text-amber-200">
                            Note: The uploaded file is for verification purposes
                            only. You still need to submit a hard copy of this
                            requirement.
                        </p>
                    </div>
                )}
                {requirements
                    .filter((req) => !req.parent_id) // Only show parent requirements
                    .map((requirement) => {
                        const reqData = requirementsData?.find(
                            (r) => r.id === requirement.id,
                        );
                        const currentStatus =
                            reqData?.status || requirement.status;
                        const currentNotes =
                            reqData?.notes || requirement.notes || '';
                        const statusInfo =
                            requirementStatusConfig[currentStatus];
                        const StatusIcon = statusInfo.icon;
                        const children = requirement.children || [];
                        const shouldShowParentNotesInput =
                            currentStatus === 'required';
                        // Check if parent has file or any child has file
                        const hasFile =
                            requirement.file_path ||
                            (children.length > 0 &&
                                children.some((child) => child.file_path));
                        const requirementPreviewUrl = requirement.file_path
                            ? requirementFileUrl(requirement.id)
                            : null;
                        const requirementDownloadUrl = requirement.file_path
                            ? requirementFileUrl(requirement.id, {
                                  download: true,
                              })
                            : null;

                        return (
                            <div key={requirement.id} className="space-y-2">
                                {/* Parent Requirement */}
                                <div className="space-y-2 rounded-lg border bg-background p-2 md:p-3">
                                    <div className="flex items-start gap-2 md:gap-3">
                                        <StatusIcon
                                            className={`mt-0.5 h-4 w-4 shrink-0 md:h-5 md:w-5 ${statusInfo.iconColor}`}
                                        />
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                    <p className="min-w-0 flex-1 text-xs leading-relaxed font-medium md:text-sm">
                                                        {
                                                            requirement.requirement_label
                                                        }
                                                    </p>
                                                    {!isStudent && hasFile && (
                                                        <span
                                                            className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                                                            title="File uploaded"
                                                        />
                                                    )}
                                                </div>
                                                {!isStudent &&
                                                    children.length === 0 &&
                                                    onStatusChange && (
                                                        <Select
                                                            value={
                                                                currentStatus
                                                            }
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                onStatusChange(
                                                                    requirement.id,
                                                                    value as ApplicationRequirement['status'],
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-7 w-full shrink-0 text-[10px] sm:w-auto sm:min-w-[100px] md:text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="pending">
                                                                    Pending
                                                                </SelectItem>
                                                                <SelectItem value="required">
                                                                    Required
                                                                </SelectItem>
                                                                <SelectItem value="approved">
                                                                    Approved
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                {isStudent &&
                                                    children.length === 0 && (
                                                        <span
                                                            className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 md:text-xs ${statusInfo.badgeColor}`}
                                                        >
                                                            {statusInfo.label}
                                                        </span>
                                                    )}
                                            </div>
                                            {/* File Display/Upload for Parent (if no children) */}
                                            {children.length === 0 && (
                                                <>
                                                    {requirement.file_path && (
                                                        <div className="flex items-center gap-1.5 rounded-md bg-muted/50 p-1.5 md:gap-2 md:p-2">
                                                            <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
                                                                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground md:h-4 md:w-4" />
                                                                <span
                                                                    className="max-w-[120px] truncate text-[10px] text-foreground md:max-w-[200px] md:text-xs"
                                                                    title={requirement.file_path
                                                                        .split(
                                                                            '/',
                                                                        )
                                                                        .pop()}
                                                                >
                                                                    {requirement.file_path
                                                                        .split(
                                                                            '/',
                                                                        )
                                                                        .pop()}
                                                                </span>
                                                            </div>
                                                            {!isStudent &&
                                                                requirementDownloadUrl && (
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger
                                                                            asChild
                                                                        >
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-6 w-6 shrink-0 p-0 md:h-7 md:w-7"
                                                                            >
                                                                                <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            {requirementPreviewUrl &&
                                                                                canPreview(
                                                                                    requirement.file_path,
                                                                                ) && (
                                                                                    <DropdownMenuItem
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                requirement.file_path
                                                                                            ) {
                                                                                                setPreviewFile(
                                                                                                    {
                                                                                                        path: requirement.file_path,
                                                                                                        name: fileName(
                                                                                                            requirement.file_path,
                                                                                                        ),
                                                                                                        url: requirementPreviewUrl,
                                                                                                    },
                                                                                                );
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                                        Preview
                                                                                    </DropdownMenuItem>
                                                                                )}
                                                                            <DropdownMenuItem
                                                                                asChild
                                                                            >
                                                                                <a
                                                                                    href={
                                                                                        requirementDownloadUrl
                                                                                    }
                                                                                    download
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                >
                                                                                    <Download className="mr-2 h-4 w-4" />
                                                                                    Download
                                                                                </a>
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                )}
                                                        </div>
                                                    )}
                                                    {isStudent &&
                                                        requirement.status ===
                                                            'required' &&
                                                        !requirement.file_path &&
                                                        onFileUpload && (
                                                            <div className="space-y-1">
                                                                <Label
                                                                    htmlFor={`file-${requirement.id}`}
                                                                    className="text-xs text-muted-foreground"
                                                                >
                                                                    Upload File
                                                                </Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Input
                                                                        id={`file-${requirement.id}`}
                                                                        type="file"
                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            const file =
                                                                                e
                                                                                    .target
                                                                                    .files?.[0];
                                                                            if (
                                                                                !file
                                                                            ) {
                                                                                return;
                                                                            }
                                                                            const maxBytes =
                                                                                10 *
                                                                                1024 *
                                                                                1024;
                                                                            if (
                                                                                file.size >
                                                                                maxBytes
                                                                            ) {
                                                                                e.target.value =
                                                                                    '';
                                                                                return;
                                                                            }
                                                                            // Store the file instead of uploading immediately
                                                                            setSelectedFiles(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [requirement.id]:
                                                                                        file,
                                                                                }),
                                                                            );
                                                                        }}
                                                                        ref={(
                                                                            el,
                                                                        ) => {
                                                                            if (
                                                                                el
                                                                            ) {
                                                                                fileInputRefs.current[
                                                                                    requirement.id
                                                                                ] =
                                                                                    el;
                                                                            }
                                                                        }}
                                                                        className="text-xs"
                                                                        disabled={
                                                                            uploadingRequirement ===
                                                                            requirement.id
                                                                        }
                                                                    />
                                                                    {selectedFiles[
                                                                        requirement
                                                                            .id
                                                                    ] && (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const file =
                                                                                    selectedFiles[
                                                                                        requirement
                                                                                            .id
                                                                                    ];
                                                                                if (
                                                                                    file
                                                                                ) {
                                                                                    onFileUpload(
                                                                                        requirement.id,
                                                                                        file,
                                                                                    );
                                                                                    setSelectedFiles(
                                                                                        (
                                                                                            prev,
                                                                                        ) => {
                                                                                            const updated =
                                                                                                {
                                                                                                    ...prev,
                                                                                                };
                                                                                            delete updated[
                                                                                                requirement
                                                                                                    .id
                                                                                            ];
                                                                                            return updated;
                                                                                        },
                                                                                    );
                                                                                    // Clear the input
                                                                                    if (
                                                                                        fileInputRefs
                                                                                            .current[
                                                                                            requirement
                                                                                                .id
                                                                                        ]
                                                                                    ) {
                                                                                        fileInputRefs.current[
                                                                                            requirement.id
                                                                                        ].value =
                                                                                            '';
                                                                                    }
                                                                                }
                                                                            }}
                                                                            disabled={
                                                                                uploadingRequirement ===
                                                                                requirement.id
                                                                            }
                                                                        >
                                                                            {uploadingRequirement ===
                                                                            requirement.id
                                                                                ? 'Uploading...'
                                                                                : 'Save'}
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                {selectedFiles[
                                                                    requirement
                                                                        .id
                                                                ] && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Selected:{' '}
                                                                        {
                                                                            selectedFiles[
                                                                                requirement
                                                                                    .id
                                                                            ]
                                                                                .name
                                                                        }
                                                                    </p>
                                                                )}
                                                                <p className="text-xs text-muted-foreground">
                                                                    Accepted
                                                                    formats:
                                                                    PDF, JPG,
                                                                    PNG (Max
                                                                    10MB)
                                                                </p>
                                                            </div>
                                                        )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Children Requirements (Indented) */}
                                {children.length > 0 && (
                                    <div className="ml-4 space-y-2 border-l-2 border-muted pl-3 md:ml-6 md:pl-4">
                                        {children.map((child) => {
                                            const childReqData =
                                                requirementsData?.find(
                                                    (r) => r.id === child.id,
                                                );
                                            const childStatus =
                                                childReqData?.status ||
                                                child.status;
                                            const childNotes =
                                                childReqData?.notes ||
                                                child.notes ||
                                                '';
                                            const childStatusInfo =
                                                requirementStatusConfig[
                                                    childStatus
                                                ];
                                            const ChildStatusIcon =
                                                childStatusInfo.icon;
                                            const shouldShowChildNotesInput =
                                                childStatus === 'required';
                                            const childPreviewUrl =
                                                child.file_path
                                                    ? requirementFileUrl(
                                                          child.id,
                                                      )
                                                    : null;
                                            const childDownloadUrl =
                                                child.file_path
                                                    ? requirementFileUrl(
                                                          child.id,
                                                          {
                                                              download: true,
                                                          },
                                                      )
                                                    : null;

                                            return (
                                                <div
                                                    key={child.id}
                                                    className="space-y-2 rounded-lg border bg-background p-2 md:p-3"
                                                >
                                                    <div className="flex items-start gap-2 md:gap-3">
                                                        <ChildStatusIcon
                                                            className={`mt-0.5 h-4 w-4 shrink-0 md:h-5 md:w-5 ${childStatusInfo.iconColor}`}
                                                        />
                                                        <div className="min-w-0 flex-1 space-y-2">
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                                                    <p className="min-w-0 flex-1 text-xs leading-relaxed font-medium md:text-sm">
                                                                        {
                                                                            child.requirement_label
                                                                        }
                                                                    </p>
                                                                    {!isStudent &&
                                                                        child.file_path && (
                                                                            <span
                                                                                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                                                                                title="File uploaded"
                                                                            />
                                                                        )}
                                                                </div>
                                                                {!isStudent &&
                                                                    onStatusChange && (
                                                                        <Select
                                                                            value={
                                                                                childStatus
                                                                            }
                                                                            onValueChange={(
                                                                                value,
                                                                            ) =>
                                                                                onStatusChange(
                                                                                    child.id,
                                                                                    value as ApplicationRequirement['status'],
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-7 w-full shrink-0 text-[10px] sm:w-auto sm:min-w-[100px] md:text-xs">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="pending">
                                                                                    Pending
                                                                                </SelectItem>
                                                                                <SelectItem value="required">
                                                                                    Required
                                                                                </SelectItem>
                                                                                <SelectItem value="approved">
                                                                                    Approved
                                                                                </SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    )}
                                                                {isStudent && (
                                                                    <span
                                                                        className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium md:px-2 md:text-xs ${childStatusInfo.badgeColor}`}
                                                                    >
                                                                        {
                                                                            childStatusInfo.label
                                                                        }
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* File Display/Upload for Child */}
                                                            {child.file_path && (
                                                                <div className="flex items-center gap-1.5 rounded-md bg-muted/50 p-1.5 md:gap-2 md:p-2">
                                                                    <div className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
                                                                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground md:h-4 md:w-4" />
                                                                        <span
                                                                            className="max-w-[120px] truncate text-[10px] text-foreground md:max-w-[200px] md:text-xs"
                                                                            title={child.file_path
                                                                                .split(
                                                                                    '/',
                                                                                )
                                                                                .pop()}
                                                                        >
                                                                            {child.file_path
                                                                                .split(
                                                                                    '/',
                                                                                )
                                                                                .pop()}
                                                                        </span>
                                                                    </div>
                                                                    {!isStudent &&
                                                                        childDownloadUrl && (
                                                                            <DropdownMenu>
                                                                                <DropdownMenuTrigger
                                                                                    asChild
                                                                                >
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        className="h-6 w-6 shrink-0 p-0 md:h-7 md:w-7"
                                                                                    >
                                                                                        <MoreVertical className="h-3 w-3 md:h-4 md:w-4" />
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    {childPreviewUrl &&
                                                                                        child.file_path &&
                                                                                        canPreview(
                                                                                            child.file_path,
                                                                                        ) && (
                                                                                            <DropdownMenuItem
                                                                                                onClick={() => {
                                                                                                    if (
                                                                                                        child.file_path
                                                                                                    ) {
                                                                                                        setPreviewFile(
                                                                                                            {
                                                                                                                path: child.file_path,
                                                                                                                name: fileName(
                                                                                                                    child.file_path,
                                                                                                                ),
                                                                                                                url: childPreviewUrl,
                                                                                                            },
                                                                                                        );
                                                                                                    }
                                                                                                }}
                                                                                            >
                                                                                                <Eye className="mr-2 h-4 w-4" />
                                                                                                Preview
                                                                                            </DropdownMenuItem>
                                                                                        )}
                                                                                    <DropdownMenuItem
                                                                                        asChild
                                                                                    >
                                                                                        <a
                                                                                            href={
                                                                                                childDownloadUrl
                                                                                            }
                                                                                            download
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                        >
                                                                                            <Download className="mr-2 h-4 w-4" />
                                                                                            Download
                                                                                        </a>
                                                                                    </DropdownMenuItem>
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        )}
                                                                </div>
                                                            )}
                                                            {isStudent &&
                                                                child.status ===
                                                                    'required' &&
                                                                !child.file_path &&
                                                                onFileUpload && (
                                                                    <div className="space-y-1">
                                                                        <Label
                                                                            htmlFor={`file-${child.id}`}
                                                                            className="text-xs text-muted-foreground"
                                                                        >
                                                                            Upload
                                                                            File
                                                                        </Label>
                                                                        <div className="flex items-center gap-2">
                                                                            <Input
                                                                                id={`file-${child.id}`}
                                                                                type="file"
                                                                                accept=".pdf,.jpg,.jpeg,.png"
                                                                                onChange={(
                                                                                    e,
                                                                                ) => {
                                                                                    const file =
                                                                                        e
                                                                                            .target
                                                                                            .files?.[0];
                                                                                    if (
                                                                                        !file
                                                                                    ) {
                                                                                        return;
                                                                                    }
                                                                                    const maxBytes =
                                                                                        10 *
                                                                                        1024 *
                                                                                        1024;
                                                                                    if (
                                                                                        file.size >
                                                                                        maxBytes
                                                                                    ) {
                                                                                        e.target.value =
                                                                                            '';
                                                                                        return;
                                                                                    }
                                                                                    // Store the file instead of uploading immediately
                                                                                    setSelectedFiles(
                                                                                        (
                                                                                            prev,
                                                                                        ) => ({
                                                                                            ...prev,
                                                                                            [child.id]:
                                                                                                file,
                                                                                        }),
                                                                                    );
                                                                                }}
                                                                                ref={(
                                                                                    el,
                                                                                ) => {
                                                                                    if (
                                                                                        el
                                                                                    ) {
                                                                                        fileInputRefs.current[
                                                                                            child.id
                                                                                        ] =
                                                                                            el;
                                                                                    }
                                                                                }}
                                                                                className="text-xs"
                                                                                disabled={
                                                                                    uploadingRequirement ===
                                                                                    child.id
                                                                                }
                                                                            />
                                                                            {selectedFiles[
                                                                                child
                                                                                    .id
                                                                            ] && (
                                                                                <Button
                                                                                    type="button"
                                                                                    size="sm"
                                                                                    onClick={() => {
                                                                                        const file =
                                                                                            selectedFiles[
                                                                                                child
                                                                                                    .id
                                                                                            ];
                                                                                        if (
                                                                                            file
                                                                                        ) {
                                                                                            onFileUpload(
                                                                                                child.id,
                                                                                                file,
                                                                                            );
                                                                                            setSelectedFiles(
                                                                                                (
                                                                                                    prev,
                                                                                                ) => {
                                                                                                    const updated =
                                                                                                        {
                                                                                                            ...prev,
                                                                                                        };
                                                                                                    delete updated[
                                                                                                        child
                                                                                                            .id
                                                                                                    ];
                                                                                                    return updated;
                                                                                                },
                                                                                            );
                                                                                            // Clear the input
                                                                                            if (
                                                                                                fileInputRefs
                                                                                                    .current[
                                                                                                    child
                                                                                                        .id
                                                                                                ]
                                                                                            ) {
                                                                                                fileInputRefs.current[
                                                                                                    child.id
                                                                                                ].value =
                                                                                                    '';
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    disabled={
                                                                                        uploadingRequirement ===
                                                                                        child.id
                                                                                    }
                                                                                >
                                                                                    {uploadingRequirement ===
                                                                                    child.id
                                                                                        ? 'Uploading...'
                                                                                        : 'Save'}
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                        {selectedFiles[
                                                                            child
                                                                                .id
                                                                        ] && (
                                                                            <p className="text-xs text-muted-foreground">
                                                                                Selected:{' '}
                                                                                {
                                                                                    selectedFiles[
                                                                                        child
                                                                                            .id
                                                                                    ]
                                                                                        .name
                                                                                }
                                                                            </p>
                                                                        )}
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Accepted
                                                                            formats:
                                                                            PDF,
                                                                            JPG,
                                                                            PNG
                                                                            (Max
                                                                            10MB)
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            {/* Display notes for students (read-only) - Child */}
                                                            {isStudent &&
                                                                childNotes &&
                                                                childNotes.trim() !==
                                                                    '' && (
                                                                    <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 md:p-3 dark:border-amber-800 dark:bg-amber-950/30">
                                                                        <p className="text-[10px] font-semibold text-amber-900 md:text-xs dark:text-amber-100">
                                                                            Notes
                                                                            from
                                                                            Coordinator:
                                                                        </p>
                                                                        <p className="text-[10px] whitespace-pre-wrap text-amber-800 md:text-xs dark:text-amber-200">
                                                                            {
                                                                                childNotes
                                                                            }
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            {/* Notes input for coordinators/admins - Child */}
                                                            {!isStudent &&
                                                                showNotesInput &&
                                                                onNotesChange &&
                                                                shouldShowChildNotesInput && (
                                                                    <div className="space-y-1">
                                                                        <Label
                                                                            htmlFor={`notes-${child.id}`}
                                                                            className="text-[10px] text-muted-foreground md:text-xs"
                                                                        >
                                                                            Notes
                                                                            (Optional)
                                                                        </Label>
                                                                        <Textarea
                                                                            id={`notes-${child.id}`}
                                                                            value={
                                                                                childNotes
                                                                            }
                                                                            onChange={(
                                                                                e,
                                                                            ) =>
                                                                                onNotesChange(
                                                                                    child.id,
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            placeholder="Add notes for this requirement..."
                                                                            rows={
                                                                                2
                                                                            }
                                                                            className="resize-none text-[10px] md:text-xs"
                                                                        />
                                                                    </div>
                                                                )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Notes Section - Show once at parent level */}
                                {!isStudent &&
                                    showNotesInput &&
                                    onNotesChange &&
                                    shouldShowParentNotesInput && (
                                        <div className="space-y-1">
                                            <Label
                                                htmlFor={`notes-${requirement.id}`}
                                                className="text-[10px] text-muted-foreground md:text-xs"
                                            >
                                                Notes (Optional)
                                            </Label>
                                            <Textarea
                                                id={`notes-${requirement.id}`}
                                                value={currentNotes}
                                                onChange={(e) =>
                                                    onNotesChange(
                                                        requirement.id,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Add notes for this requirement..."
                                                rows={2}
                                                className="resize-none text-[10px] md:text-xs"
                                            />
                                        </div>
                                    )}
                                {/* Display notes for students (read-only) */}
                                {isStudent &&
                                    currentNotes &&
                                    currentNotes.trim() !== '' && (
                                        <div className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 md:p-3 dark:border-amber-800 dark:bg-amber-950/30">
                                            <p className="text-[10px] font-semibold text-amber-900 md:text-xs dark:text-amber-100">
                                                Notes from Coordinator:
                                            </p>
                                            <p className="text-[10px] whitespace-pre-wrap text-amber-800 md:text-xs dark:text-amber-200">
                                                {currentNotes}
                                            </p>
                                        </div>
                                    )}
                            </div>
                        );
                    })}
                {allRequirementsApproved &&
                    showDownloadButton &&
                    applicationNumber && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                            <div>
                                <p className="text-sm font-medium">
                                    All requirements approved
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    You can now download the application form
                                </p>
                            </div>
                            <div>
                                <DownloadFormButton
                                    applicationNumber={applicationNumber}
                                    route={getDownloadRoute()}
                                    size="sm"
                                    variant="default"
                                />
                            </div>
                        </div>
                    )}
            </div>

            {/* Preview Dialog */}
            <Dialog
                open={!!previewFile}
                onOpenChange={(open) => !open && setPreviewFile(null)}
            >
                <DialogContent className="flex h-full !max-h-[95vh] w-full !max-w-[95vw] flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{previewFile?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto">
                        {previewFile && (
                            <>
                                {isPdfFile(previewFile.path) ? (
                                    <iframe
                                        src={previewFile.url}
                                        className="h-full w-full rounded border"
                                        title={previewFile.name}
                                    />
                                ) : isImageFile(previewFile.path) ? (
                                    <div className="flex h-full items-center justify-center">
                                        <img
                                            src={previewFile.url}
                                            alt={previewFile.name}
                                            className="max-h-full max-w-full rounded object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <p className="text-muted-foreground">
                                            Preview not available for this file
                                            type
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
