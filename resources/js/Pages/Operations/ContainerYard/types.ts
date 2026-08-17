export interface YardContainerRow {
    id: number;
    container: string;
    category: string | null;
    iso_type: string | null;
    position: string | null;
    time_in: string | null;
    notes: string | null;
    dwell_days: number | null;
    line_op: string | null;
    transit_state: string | null;
    condition: string | null;
    pod: string | null;
    pod_place_name: string | null;
    pol: string | null;
    pol_place_name: string | null;
    outbound_carrier_id: string | null;
    outbound_carrier_name: string | null;
    inbound_carrier_id: string | null;
    inbound_carrier_name: string | null;
    shipper: string | null;
    consignee: string | null;
    requires_power: boolean;
    is_powered: boolean;
}

export interface YardBlockRow {
    id: number;
    name: string;
    bay_start: number;
    bay_end: number;
    row_start: string;
    row_end: string;
    max_tier: number;
    facility: 'Terminal' | 'ECD';
    road_side: 'row_start' | 'row_end' | 'both';
    excluded_rows: string | null;
    is_active: boolean;
    total_bays?: number;
    total_rows?: number;
    total_capacity?: number;
}

export interface YardAllocationRow {
    id: number;
    service: string | null;
    discharge_port: string | null;
    iso_basic_length: string | null;
    reefer_type: string | null;
    location: string;
}

export interface YardSyncLogRow {
    id: number;
    ran_at: string;
    status: 'success' | 'error';
    message: string | null;
    count: number;
    trigger: 'scheduled' | 'manual';
}

export interface BlocksDataResponse {
    success: boolean;
    data: YardBlockRow[];
    pagination: { current_page: number; total: number; per_page: number; last_page: number } | null;
}

export interface ContainersDataResponse {
    success: boolean;
    data: YardContainerRow[];
    pagination: { current_page: number; total: number; per_page: number; last_page: number } | null;
}

export interface LiveSearchRow {
    container: string;
    category: string | null;
    pos: string | null;
    move_kind: string | null;
    type_iso: string | null;
    line_op: string | null;
    ob_vessel: string | null;
    ib_vessel: string | null;
    yard_slot: string | null;
    reefer_type: string | null;
    vessel_service: string | null;
    container_port: string | null;
    iso_basic_length: string | null;
    [key: string]: unknown;
}

export interface LiveSearchResponse {
    success: boolean;
    data: LiveSearchRow[];
    count: number;
    allowed_locations: string[];
    debug_filter: Record<string, unknown> | null;
    error?: string;
}
