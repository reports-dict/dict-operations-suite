<?php

namespace App\Services\Operations;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ConsigneeService
{
    /**
     * Consignee/customer reference list against the read-only sparcsn4
     * connection - DICT_BS lives on the same SQL Server host, so the
     * database is qualified directly in the query rather than needing a
     * separate connection.
     *
     * @return Collection<int, array{customer_id: string, customer_name: string}>
     */
    public function fetch(): Collection
    {
        $sql = <<<SQL
            SELECT
                DCCust_ID,
                DCCust_Name
            FROM [DICT_BS].[dbo].[DCSCustomer]
            SQL;

        $rows = DB::connection('sparcsn4')->select($sql);

        return collect($rows)->map(fn ($row) => [
            'customer_id' => $row->DCCust_ID,
            'customer_name' => $row->DCCust_Name,
        ]);
    }
}
