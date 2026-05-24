<?php

namespace App\Exports;

class CoordinatorWindowApplicationsExport extends WindowApplicationsExport
{
    /**
     * @param  array<int, int>  $departmentIds
     */
    public function __construct(
        int $windowId,
        array $departmentIds,
        ?string $search = null,
        ?string $departmentName = null,
    ) {
        parent::__construct(
            windowId: $windowId,
            departmentName: $departmentName,
            departmentIds: $departmentIds,
            search: $search,
        );
    }
}
