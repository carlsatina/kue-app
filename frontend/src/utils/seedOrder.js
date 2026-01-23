const SEED_MATCH_ID = "__seed__";

function extractSeedOrder(overrides, matchFormat) {
  if (!Array.isArray(overrides)) return [];
  const filtered = overrides.filter(
    (override) =>
      override?.matchId === SEED_MATCH_ID &&
      (!matchFormat || override.matchFormat === matchFormat)
  );
  if (!filtered.length) return [];
  const selected = filtered[filtered.length - 1];
  const seeds = selected?.scoreJson?.seeds;
  return Array.isArray(seeds) ? seeds.filter(Boolean) : [];
}

function applySeedOrder(players, orderIds) {
  if (!Array.isArray(players)) return [];
  if (!Array.isArray(orderIds) || orderIds.length === 0) return players.slice();
  const map = new Map(players.map((player) => [player.id, player]));
  const used = new Set();
  const ordered = [];
  orderIds.forEach((id) => {
    const player = map.get(id);
    if (!player || used.has(id)) return;
    ordered.push(player);
    used.add(id);
  });
  players.forEach((player) => {
    if (!used.has(player.id)) ordered.push(player);
  });
  return ordered;
}

export { SEED_MATCH_ID, extractSeedOrder, applySeedOrder };
