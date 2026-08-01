<?php

namespace App\Services\Operations\DriverAssignment;

use App\Models\Driver;
use App\Models\Truck;
use App\Models\TruckAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TruckAssignmentService
{
    /**
     * Assign an on-duty driver to a truck. Only one active assignment is
     * ever allowed per truck AND per driver - assigning ends whichever
     * prior assignment existed on either side, keeping the ended row as
     * history rather than deleting it.
     */
    public function assign(Truck $truck, Driver $driver, User $actor): TruckAssignment
    {
        if (! $driver->on_duty) {
            throw ValidationException::withMessages([
                'driver_id' => 'Driver is not currently on duty.',
            ]);
        }

        return DB::transaction(function () use ($truck, $driver, $actor) {
            $now = now();

            TruckAssignment::query()
                ->where('truck_id', $truck->id)
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first()
                ?->update([
                    'ended_at' => $now,
                    'ended_by_user_id' => $actor->id,
                    'end_reason' => 'reassigned_truck',
                ]);

            TruckAssignment::query()
                ->where('driver_id', $driver->id)
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first()
                ?->update([
                    'ended_at' => $now,
                    'ended_by_user_id' => $actor->id,
                    'end_reason' => 'reassigned_driver',
                ]);

            return TruckAssignment::create([
                'truck_id' => $truck->id,
                'driver_id' => $driver->id,
                'assigned_at' => $now,
                'assigned_by_user_id' => $actor->id,
            ]);
        });
    }

    /**
     * End a truck's active assignment, if it has one. No-op otherwise.
     */
    public function unassign(Truck $truck, ?User $actor, string $reason = 'manual_unassign'): void
    {
        DB::transaction(function () use ($truck, $actor, $reason) {
            TruckAssignment::query()
                ->where('truck_id', $truck->id)
                ->whereNull('ended_at')
                ->lockForUpdate()
                ->first()
                ?->update([
                    'ended_at' => now(),
                    'ended_by_user_id' => $actor?->id,
                    'end_reason' => $reason,
                ]);
        });
    }
}
