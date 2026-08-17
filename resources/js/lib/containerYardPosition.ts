// Position parser for Container Yard - ported from local-simplified-xps-v2's
// resources/js/utils/positionParser.js. Position format: "B{block}{bay}{row}{tier}",
// e.g. "B0707F1" = Block B07, Bay 07, Row F, Tier 1.

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const MAX_TIERS = 5;

export interface ParsedPosition {
    block: string;
    bay: number;
    row: string;
    tier: number;
}

export function parsePosition(position: string | null | undefined): ParsedPosition | null {
    if (!position) return null;

    try {
        if (position.length < 6) return null;

        const prefix = position[0];
        const block = prefix + position.substring(1, 3);
        const bay = parseInt(position.substring(3, 5), 10);
        const row = position[5];
        const tier = parseInt(position.substring(6), 10);

        if (prefix !== 'B' || isNaN(bay) || isNaN(tier) || !ROWS.includes(row)) {
            return null;
        }

        return { block, bay, row, tier };
    } catch {
        return null;
    }
}
