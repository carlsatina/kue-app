const STORAGE_PREFIX = "kue:manual-teams:";

export function loadManualTeams(sessionId) {
  if (!sessionId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((team) => team && Array.isArray(team.memberIds));
  } catch {
    return [];
  }
}

export function saveManualTeams(sessionId, teams) {
  if (!sessionId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(teams || []));
  } catch {
    // ignore storage errors
  }
}

export function clearManualTeams(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${sessionId}`);
  } catch {
    // ignore storage errors
  }
}
