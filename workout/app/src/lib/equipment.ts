export const EQUIPMENT_LABELS: Record<string, string> = {
  rings: 'Kółka gimnastyczne (stacja 1)',
  airwalker: 'Air Walker',
  bench: 'Ławka do brzuszków',
  street: 'Stacja street workout',
  bike: 'Rower stacjonarny',
  pullup_dip: 'Drążek + poręcze do dipów',
  floor: 'Podłoga / mata'
};

export function equipmentLabel(ref: string): string {
  return EQUIPMENT_LABELS[ref] ?? ref;
}
