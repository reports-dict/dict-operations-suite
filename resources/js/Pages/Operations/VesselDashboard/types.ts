export interface VesselGraphEntry {
    hour: number;
    hour_bucket: string;
    total: number;
    QC1: number;
    QC2: number;
    QC3: number;
    QC4: number;
    UNKR: number;
    ECIN: number;
}

export interface HourDetailSource<T> {
    data: T[];
    error: string | null;
}

export interface HourDetailTruckRow {
    truck: string;
    move_count: number;
    drivers: string | null;
    pows: string | null;
}

export interface HourDetailTruckModelRow {
    model: string;
    move_count: number;
    locations: string;
    drivers: string;
}

export interface HourDetailResponse {
    hour_bucket: string;
    sqlsrv: HourDetailSource<HourDetailTruckRow>;
    supabase: HourDetailSource<HourDetailTruckModelRow>;
}

export interface VesselVisit {
    ob_ib_id: string;
    actual_time_of_arrival: string | null;
    actual_time_of_departure: string | null;
    vessel_name: string;
    service: string;
    vessel_id: string;
    phase: string;
    line_op: string;
    total_planned_loading_wi: number;
    load_plan_fcl_20ft: number;
    load_plan_fcl_40ft: number;
    load_plan_empty_20ft: number;
    load_plan_empty_40ft: number;
    total_loaded_count: number;
    loaded_fcl_20ft: number;
    loaded_fcl_40ft: number;
    loaded_empty_20ft: number;
    loaded_empty_40ft: number;
    total_planned_discharge: number;
    discharge_plan_fcl_20ft: number;
    discharge_plan_fcl_40ft: number;
    discharge_plan_mty_20ft: number;
    discharge_plan_mty_40ft: number;
    total_discharged_count: number;
    discharged_fcl_20ft: number;
    discharged_fcl_40ft: number;
    discharged_empty_20ft: number;
    discharged_empty_40ft: number;
    has_override: boolean;
    graph: VesselGraphEntry[] | null;
}

export type ScheduleStatus = 'scheduled' | 'on_dock' | 'departed';

export interface VesselSchedule {
    id: number;
    service: string;
    line_operator: string;
    vessel_name: string;
    etb: string;
    etd: string;
    estimated_moves: number;
    loa_meters: string; // decimal cast serializes as a fixed-precision string, e.g. "250.00"
    berth_number: string | null;
    status: ScheduleStatus;
    matched_ob_ib_id: string | null;
    on_dock_at: string | null;
    departed_at: string | null;
}

export interface DashboardDataResponse {
    vessels: VesselVisit[];
    schedules: VesselSchedule[];
    fetched_at: string;
}

export interface VesselSyncLogRow {
    id: number;
    ran_at: string;
    rows_fetched: number;
    rows_upserted: number;
    status: 'success' | 'failed';
    error_message: string | null;
    duration_ms: number;
}
