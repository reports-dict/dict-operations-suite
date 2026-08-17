<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ContainerYardBoardController extends Controller
{
    /**
     * Public, unauthenticated kiosk board (see routes/kiosk.php). No
     * server-rendered props - the page client-fetches
     * ContainerYardDataController's blocks/containers/search endpoints,
     * same pattern as VesselDashboardBoardController.
     */
    public function __invoke(): Response
    {
        return Inertia::render('Operations/ContainerYard/Board');
    }
}
