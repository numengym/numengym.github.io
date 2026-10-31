// The colours a druid's cat and bear forms come in, per race, after the game's own form choices. Each palette: base
// (the body's fur or feathers), light (head, muzzle, belly), dark (paws, stripes, feathered legs), mane (the mane,
// crest or ruff), mark (the painted circle and crescent on the shoulder), eye (the glow). The first is the default.
export const FORM_COLORS = {
  RaceNightElf: {
    bear: {
      blue: { base: 0x8a86a0, light: 0xd2ced8, dark: 0x4a4658, mane: 0x2a3a34, mark: 0x4a3a62, eye: 0xf0f0a0 },
      white: { base: 0xd6d4ca, light: 0xeeece6, dark: 0x8a8a84, mane: 0x2a3042, mark: 0x6a3a42, eye: 0xf0f0a0 },
      brown: { base: 0x9a7458, light: 0xd0c4b0, dark: 0x5a3e2c, mane: 0x283048, mark: 0x4a4a30, eye: 0xf0f0a0 },
      purple: { base: 0x8a6a8a, light: 0xc8c0d0, dark: 0x4a3a4a, mane: 0x203838, mark: 0x302838, eye: 0xbfe8ff },
    },
    cat: {
      violet: { base: 0x8a6a8a, light: 0xdccad8, dark: 0x5a4058, mane: 0x7a3a8a, mark: 0xb8d8c0, eye: 0xc0ff60 },
      purple: { base: 0x4a3a6a, light: 0xb0b4c8, dark: 0x302848, mane: 0xc8c8d4, mark: 0x9a9ac8, eye: 0xe8f8ff },
      blue: { base: 0x3a3e6a, light: 0xa8c8c0, dark: 0x262848, mane: 0x3a50a0, mark: 0xd0a8c0, eye: 0xe8f8ff },
      white: { base: 0xd8d8e0, light: 0xf2f2f6, dark: 0x9a98a8, mane: 0xd090c8, mark: 0x2a5070, eye: 0xf0e8a0 },
      black: { base: 0x2a2a38, light: 0x6a6a7a, dark: 0x18181f, mane: 0x5a9a98, mark: 0xc8c8d0, eye: 0xff9ad8 },
    },
  },
  RaceTauren: {
    bear: {
      black: { base: 0x332a28, light: 0x6c6c74, dark: 0x1e1816, mane: 0x4a3a2e, mark: 0xc0882a, eye: 0xc8d8e8 },
      silver: { base: 0x9a988e, light: 0xc8c6bc, dark: 0x5a5852, mane: 0x3a4048, mark: 0x6a6ae0, eye: 0xc8d8e8 },
      yellow: { base: 0xa88a58, light: 0xd0bc94, dark: 0x6a5232, mane: 0x1e1e1e, mark: 0x2a7ab8, eye: 0xc8d8e8 },
      brown: { base: 0x8a6248, light: 0xc4a88e, dark: 0x4e3424, mane: 0x2a2a2a, mark: 0xb03028, eye: 0xd8b060 },
      white: { base: 0xd8d4c4, light: 0xeeebe0, dark: 0x8e8a7e, mane: 0x5a564e, mark: 0x8a2a3a, eye: 0xc8d8e8 },
    },
    cat: {
      black: { base: 0x2c2e3a, light: 0x8a8a92, dark: 0x1a1a22, mane: 0xb4b2b0, mark: 0xb02a24, eye: 0xe0c060 },
      white: { base: 0xcfc8b0, light: 0xeae4d4, dark: 0x8a846e, mane: 0x3a3a40, mark: 0x2a7ab0, eye: 0xa8c8e8 },
      brown: { base: 0x9a7a48, light: 0xc8a878, dark: 0x5a4428, mane: 0xc8a868, mark: 0x5a3a20, eye: 0xc8a8e0 },
      red: { base: 0x8a4a28, light: 0xc0905e, dark: 0x4a2414, mane: 0x2a1c18, mark: 0xd8d0b0, eye: 0x7ae0a0 },
      yellow: { base: 0xb08e48, light: 0xd4bc84, dark: 0x6a5228, mane: 0x5a3a24, mark: 0x9a4a2a, eye: 0xa8d0a0 },
    },
  },
  RaceHighOrderSkyborne: {
    bear: {
      blue: { base: 0x8fb0c4, light: 0xc8d6de, dark: 0x4a4f8a, mane: 0x5a62a8, mark: 0x3fd4ff, eye: 0xe8f040 },
      grey: { base: 0x5a6a9a, light: 0x6a4a8a, dark: 0x2e2a5a, mane: 0x4a3a7a, mark: 0x5ae8ff, eye: 0x9ff4ff },
      green: { base: 0xb8ab98, light: 0xd8d0c4, dark: 0x6a4048, mane: 0x7a5058, mark: 0x3fd4ff, eye: 0x9ff4ff },
      white: { base: 0xd4d8dc, light: 0x6aa0b8, dark: 0x3a6a88, mane: 0x4a88a8, mark: 0x40e8d0, eye: 0xe8f040 },
    },
    cat: {
      blue: { base: 0x8fb0c4, light: 0xd0dae0, dark: 0x5040a0, mane: 0x4a58a8, mark: 0x3fd4ff, eye: 0xe8f040 },
      grey: { base: 0x6a7ab0, light: 0x3a2a6a, dark: 0x3a2a6a, mane: 0x4a3a7a, mark: 0x5ae8ff, eye: 0x9ff4ff },
      green: { base: 0xb0a898, light: 0xc8c0b4, dark: 0x5a4048, mane: 0x6a4a50, mark: 0x3fd4ff, eye: 0xe8f040 },
      white: { base: 0xd8dade, light: 0x4a88a8, dark: 0x2f6a88, mane: 0x3a7a9a, mark: 0x40e8d0, eye: 0xe8f040 },
    },
  },
};
// The Windshaper Skyborne take the same forms as the High Order.
FORM_COLORS.RaceWindshaperSkyborne = FORM_COLORS.RaceHighOrderSkyborne;

// The colour names a race's form comes in (none: it has no such form).
export const formColorNames = (race, kind) => Object.keys((FORM_COLORS[race] || {})[kind] || {});
// A form's palette: the one chosen, else the race's first.
export function formPalette(race, kind, name) {
  const all = (FORM_COLORS[race] || {})[kind];
  if (!all) return null;
  return all[name] || Object.values(all)[0];
}
