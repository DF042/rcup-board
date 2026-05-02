export const SLOT_ORDER: Record<string, number> = {
  QB: 0,
  WR: 1,
  RB: 2,
  FLEX: 3,
  "W/R/T": 3,
  "W/R": 3,
  TE: 4,
  K: 5,
  DEF: 6,
};

export function slotSortKey(slot: string | null | undefined): number {
  if (!slot) return 99;
  if (slot in SLOT_ORDER) return SLOT_ORDER[slot];
  for (const key of Object.keys(SLOT_ORDER)) {
    if (slot.startsWith(key)) return SLOT_ORDER[key];
  }
  return 99;
}
