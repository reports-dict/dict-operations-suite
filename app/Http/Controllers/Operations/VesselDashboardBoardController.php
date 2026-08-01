<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class VesselDashboardBoardController extends Controller
{
    /**
     * Public, unauthenticated kiosk board (see routes/kiosk.php). No
     * server-rendered props - the page client-polls
     * VesselDashboardDataController every 60s, same as the source app.
     */
    public function __invoke(): Response
    {
        return Inertia::render('Operations/VesselDashboard/Board');
    }
}
