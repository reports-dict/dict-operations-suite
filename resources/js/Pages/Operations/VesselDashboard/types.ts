export interface VesselGraphEntry {
    hour: number;
    total: number;
    QC1: number;
    QC2: number;
    QC3: number;
    QC4: number;
    UNKR: number;
    ECIN: number;
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

export interface DashboardDataResponse {
    vessels: VesselVisit[];
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
