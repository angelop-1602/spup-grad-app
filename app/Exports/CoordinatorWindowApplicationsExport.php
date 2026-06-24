<?php

namespace App\Exports;

class CoordinatorWindowApplicationsExport extends WindowApplicationsExport
{
    /**
     * @param  array<int, int>  $departmentIds
     * @param  array<int, int>|null  $courseIds
     */
    public function __construct(
        int $windowId,
        array $departmentIds,
        ?array $courseIds = null,
        ?string $search = null,
        ?string $departmentName = null,
    ) {
        parent::__construct(
            windowId: $windowId,
            departmentName: $departmentName,
            departmentIds: $departmentIds,
            courseIds: $courseIds,
            search: $search,
        );
    }
}
