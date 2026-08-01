import { PaginationLink } from '@/Components/ui/Pagination';

export interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

export interface TatHistoryRow {
    id: number;
    shift_label: string;
    shift_start: string;
    shift_end: string;
    status?: 'precheck_to_outgate' | 'ingate_to_outgate';
    avg_tat: string | null;
    avg_tat_seconds: number;
    recorded_at: string;
}

export interface HighElapsedTransactionRow {
    id: number;
    container: string;
    category: string | null;
    precheck_time?: string | null;
    truck_visit_entered_yard?: string | null;
    elapsed_time: string | null;
    assigned_che: string | null;
    type_iso: string | null;
    ob_carrier: string | null;
    trucking_company?: string | null;
    freight_kind: string | null;
    line_op: string | null;
    pos_slot_from: string | null;
    pos_slot: string | null;
    bat_nbr: string;
    first_captured_at: string;
    last_seen_at: string;
}
