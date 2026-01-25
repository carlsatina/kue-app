<template>
  <div class="stack public-queue" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
    <div class="pull-indicator" :class="{ active: isPulling || refreshing }">
      <span v-if="!refreshing">Pull down to refresh</span>
      <span v-else>Refreshing…</span>
    </div>
    <div class="queue-hero">
      <div class="queue-hero-top">
        <div>
          <div class="queue-hero-eyebrow">Live queue</div>
          <h2 class="queue-hero-title">{{ data.session?.name || 'Queue' }}</h2>
          <div class="queue-hero-subtitle">Live queue + courts</div>
        </div>
        <div class="queue-hero-actions">
          <div class="queue-live-pill">
            <span class="queue-live-dot" aria-hidden="true"></span>
            Live
          </div>
          <button class="button ghost button-compact queue-hero-action" @click="openRankings">
            Rankings
            <span v-if="totalPlayers" class="queue-hero-count">{{ totalPlayers }}</span>
          </button>
          <button class="button ghost button-compact queue-hero-action" @click="openBracket">
            Bracket
          </button>
        </div>
      </div>
      <div class="queue-hero-stats">
        <div class="queue-stat">
          <span>Courts</span>
          <strong>{{ data.courts?.length || 0 }}</strong>
        </div>
        <div class="queue-stat">
          <span>Matches</span>
          <strong>{{ queueMatches.length }}</strong>
        </div>
      </div>
    </div>

    <div class="card stack queue-section">
      <div class="queue-section-head">
        <div class="section-title">Now Playing</div>
        <span class="queue-section-badge">{{ data.courts?.length || 0 }} courts</span>
      </div>
      <div v-if="data.courts?.length === 0" class="subtitle">No courts yet.</div>
      <div v-else class="grid courts-grid">
        <div
          v-for="court in data.courts || []"
          :key="court.court.id"
          class="card court-card"
          :class="{ playing: court.currentMatch }"
        >
          <div class="court-head">
            <div class="court-title">
              <strong class="court-name">{{ court.court.name }}</strong>
            </div>
            <span class="badge court-status" :class="courtStatusClass(court)">
              {{ statusLabel(court.status) }}
            </span>
          </div>

          <div class="court-meta">
            <div class="court-meta-block">
              <div class="subtitle">Start</div>
              <strong>{{ formatTime(court.currentMatch?.startedAt) }}</strong>
            </div>
            <div class="court-meta-block">
              <div class="subtitle">Elapsed</div>
              <strong>{{ elapsedTime(court.currentMatch?.startedAt) }}</strong>
            </div>
          </div>

          <div class="court-players">
            <div class="subtitle">Players</div>
            <div v-if="court.currentMatch" class="pill-row court-pill-row">
              <span class="pill team-a">{{ teamLabel(court.currentMatch, 1) || "—" }}</span>
              <span class="court-vs">vs</span>
              <span class="pill team-b">{{ teamLabel(court.currentMatch, 2) || "—" }}</span>
            </div>
            <div v-else class="subtitle muted">No match yet</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card stack queue-section">
      <div class="queue-section-head">
        <div class="section-title">Upcoming Matches</div>
        <span class="queue-section-badge">{{ queueMatches.length }} in queue</span>
      </div>
      <div v-if="queueMatches.length === 0" class="subtitle">No queued matches.</div>
      <div v-for="(match, idx) in queueMatches" :key="match.id" class="queue-card">
        <div class="queue-card-head">
          <strong>#{{ idx + 1 }} {{ match.typeLabel }}</strong>
          <span class="subtitle">Requested {{ formatTime(match.requestedAt) }}</span>
        </div>
        <div class="queue-vs">
          <div class="queue-team">
            <strong>{{ match.teamA.join(' + ') }}</strong>
          </div>
          <span class="queue-vs-pill">vs</span>
          <div class="queue-team">
            <strong>{{ match.teamB.join(' + ') }}</strong>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div v-if="showRankingsModal" class="modal-backdrop">
    <div class="modal-card rank-modal">
      <div class="rank-modal-head">
        <div>
          <div class="subtitle">Current session</div>
          <h3>Rankings</h3>
        </div>
        <span class="queue-section-badge">{{ totalCount }} {{ summaryLabel }}</span>
      </div>
      <div v-if="showTeamToggle" class="segmented rank-toggle">
        <button
          class="segment"
          :class="{ active: rankMode === 'players' }"
          type="button"
          @click="rankMode = 'players'"
        >
          Players
        </button>
        <button
          class="segment"
          :class="{ active: rankMode === 'teams' }"
          type="button"
          @click="rankMode = 'teams'"
        >
          Teams
        </button>
      </div>
      <div v-if="teamRankLoading && isTeamView" class="subtitle">Loading teams…</div>
      <div v-else-if="rankedRows.length === 0" class="subtitle">No stats yet.</div>
      <div v-else class="rank-modal-body">
        <div v-for="row in rankedRows" :key="row.id" class="rank-row">
          <div class="rank-row-left">
            <div class="rank-row-badge" :class="rankClass(row.rank)">
              <span class="rank-number">{{ row.rank }}</span>
            </div>
            <div class="rank-row-name">{{ row.name }}</div>
          </div>
          <div class="rank-row-icon">{{ rankCornerIcon(row.rank) }}</div>
          <div class="rank-row-stats">
            <span class="rank-pill">GP {{ row.gamesPlayed }}</span>
            <span class="rank-pill win">W {{ row.wins }}</span>
            <span class="rank-pill loss">L {{ row.losses }}</span>
            <span class="rank-pill pct">{{ winPct(row.winPct) }}</span>
          </div>
        </div>
      </div>
      <button class="button" @click="closeRankings">Close</button>
    </div>
  </div>

  <div v-if="showBracketModal" class="modal-backdrop bracket-backdrop">
    <div class="modal-card bracket-modal">
      <div class="bracket-modal-head">
        <div>
          <div class="subtitle">Current session</div>
          <h3>Bracket</h3>
        </div>
        <button class="button ghost button-compact" @click="closeBracket">Close</button>
      </div>
      <div v-if="bracketLoading" class="subtitle">Loading bracket…</div>
      <div v-else-if="bracketError" class="notice">{{ bracketError }}</div>
      <div v-else class="bracket-modal-body">
        <div v-if="!bracketData || bracketData.error" class="subtitle">
          {{ bracketData?.error || "Bracket unavailable." }}
        </div>
        <div v-else class="bracket-surface">
          <div v-if="bracketData.type === 'single'" class="tournament-bracket">
            <TournamentBracket v-bind="bracketVisuals" :rounds="bracketData.rounds" />
          </div>
          <div v-else-if="bracketData.type === 'double'" class="tournament-bracket-stack">
            <div class="tournament-bracket-block">
              <div class="subtitle">Winners Bracket</div>
              <div class="tournament-bracket">
                <TournamentBracket v-bind="bracketVisuals" :rounds="bracketData.winners" />
              </div>
            </div>
            <div v-if="bracketData.losers?.length" class="tournament-bracket-block">
              <div class="subtitle">Losers Bracket</div>
              <div class="tournament-bracket">
                <TournamentBracket v-bind="bracketVisuals" :rounds="bracketData.losers" />
              </div>
            </div>
            <div v-if="bracketData.finals?.length" class="tournament-bracket-block">
              <div class="subtitle">Grand Final</div>
              <div class="tournament-bracket">
                <TournamentBracket v-bind="bracketVisuals" :rounds="bracketData.finals" />
              </div>
            </div>
          </div>
          <div v-else class="stack round-robin">
            <div v-if="roundRobinStandings.length" class="round-robin-standings">
              <div class="subtitle">Standings</div>
              <div class="standings-table">
                <div class="standings-row head">
                  <span>#</span>
                  <span>Team</span>
                  <span>W</span>
                  <span>L</span>
                  <span>GP</span>
                  <span>PTS</span>
                </div>
                <div v-for="team in roundRobinStandings" :key="team.id" class="standings-row">
                  <span class="standings-rank">{{ team.rank }}</span>
                  <span class="standings-name">{{ team.name }}</span>
                  <span>{{ team.wins }}</span>
                  <span>{{ team.losses }}</span>
                  <span>{{ team.gamesPlayed }}</span>
                  <span class="standings-points">{{ team.pointsFor }}</span>
                </div>
              </div>
            </div>
            <div v-for="round in bracketData.rounds" :key="round.name" class="round-robin-round">
              <div class="subtitle">{{ round.name }}</div>
              <div class="stack">
                <div v-for="match in round.matchs" :key="match.id" class="match-card simple">
                  <div class="match-line">
                    <span class="match-name">{{ match.team1?.name || "-" }}</span>
                    <span v-if="roundRobinScore(match, 1) != null" class="match-score-pill">
                      {{ roundRobinScore(match, 1) }}
                    </span>
                  </div>
                  <div class="match-line">
                    <span class="match-name">{{ match.team2?.name || "-" }}</span>
                    <span v-if="roundRobinScore(match, 2) != null" class="match-score-pill">
                      {{ roundRobinScore(match, 2) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { TournamentBracket } from "vue3-tournament";
import { applySeedOrder, extractSeedOrder } from "../utils/seedOrder.js";
import "vue3-tournament/style.css";
import { api } from "../api.js";
import { useRoute } from "vue-router";

const route = useRoute();
const data = ref({});
const rankedPlayers = ref([]);
const totalPlayers = ref(0);
const rankMode = ref("players");
const teamRankMatches = ref([]);
const teamRankLoading = ref(false);
const startY = ref(0);
const isPulling = ref(false);
const refreshing = ref(false);
const nowTick = ref(Date.now());
let timerId = null;
const showRankingsModal = ref(false);
const showBracketModal = ref(false);
const bracketLoading = ref(false);
const bracketError = ref("");
const bracketSession = ref(null);
const bracketPlayers = ref([]);
const bracketMatches = ref([]);
const bracketOverrides = ref([]);
const bracketType = ref("single");
const bracketVisuals = {
  format: "default",
  textColor: "#1f1c17",
  titleColor: "#5b5248",
  teamBackgroundColor: "transparent",
  highlightTeamBackgroundColor: "rgba(15, 157, 138, 0.08)",
  scoreBackgroundColor: "#5c9cff",
  winnerScoreBackgroundColor: "#5c9cff"
};

const bracketMatchFormat = computed(() => bracketSession.value?.gameType || "doubles");

const bracketJoinedPlayers = computed(() => {
  return bracketPlayers.value
    .filter((sp) => sp.status !== "done")
    .sort((a, b) => new Date(a.checkedInAt) - new Date(b.checkedInAt))
    .map((sp) => ({
      id: sp.player.id,
      name: sp.player.nickname || sp.player.fullName
    }));
});

const bracketSeedOrderIds = computed(() =>
  extractSeedOrder(bracketOverrides.value, bracketMatchFormat.value)
);

const bracketSeededPlayers = computed(() =>
  applySeedOrder(bracketJoinedPlayers.value, bracketSeedOrderIds.value)
);

const bracketEntrants = computed(() => {
  if (bracketMatchFormat.value === "doubles") {
    return buildTeamEntrants(bracketJoinedPlayers.value, []);
  }
  return bracketSeededPlayers.value;
});

const bracketEntrantKeys = computed(() => {
  const keys = bracketEntrants.value
    .map((entrant) => (typeof entrant === "string" ? entrant : entrant?.id))
    .filter(Boolean);
  return new Set(keys);
});

const bracketOverrideMap = computed(() => {
  const map = {};
  bracketOverrides.value.forEach((override) => {
    if (override.bracketType !== bracketType.value) return;
    if (override.matchFormat !== bracketMatchFormat.value) return;
    map[override.matchId] = {
      winnerId: override.winnerId,
      score: override.scoreJson
    };
  });
  return map;
});

const bracketMatchResults = computed(() => buildMatchResults(bracketMatches.value));
const roundRobinStandings = computed(() => {
  if (bracketType.value !== "round_robin") return [];
  if (!bracketData.value?.rounds) return [];
  return buildRoundRobinStandings(bracketData.value.rounds, bracketEntrants.value);
});

const bracketData = computed(() => {
  if (!bracketSession.value) return null;
  if (bracketEntrants.value.length < 2) {
    const label = bracketMatchFormat.value === "doubles" ? "teams" : "players";
    return { error: `At least 2 ${label} are required.` };
  }
  if (bracketType.value === "single") {
    return {
      type: "single",
      rounds: applyMatchResults(buildSingleElimination(bracketEntrants.value), true)
    };
  }
  if (bracketType.value === "double") {
    const data = buildDoubleElimination(bracketEntrants.value);
    return {
      ...data,
      winners: applyMatchResults(data.winners, true),
      losers: applyMatchResults(data.losers),
      finals: applyMatchResults(data.finals)
    };
  }
  return {
    type: "round_robin",
    rounds: applyMatchResults(buildRoundRobin(bracketEntrants.value))
  };
});

const queueMatches = computed(() => {
  const entries = (data.value.queue || []).slice();
  const matches = [];
  for (let i = 0; i < entries.length; i += 2) {
    const a = entries[i];
    const b = entries[i + 1];
    if (!a || !b) break;
    matches.push({
      id: `${a.id}-${b.id}`,
      typeLabel: a.type === "doubles" ? "Doubles Match" : "Singles Match",
      teamA: a.players.map((p) => p.player.nickname || p.player.fullName),
      teamB: b.players.map((p) => p.player.nickname || p.player.fullName),
      requestedAt: a.createdAt
    });
  }
  return matches;
});

const showTeamToggle = computed(() => data.value?.session?.gameType === "doubles");
const isTeamView = computed(() => rankMode.value === "teams" && showTeamToggle.value);
const rankedRows = computed(() =>
  isTeamView.value ? buildTeamRankings(teamRankMatches.value) : buildPlayerRows(rankedPlayers.value)
);
const totalCount = computed(() => (isTeamView.value ? rankedRows.value.length : totalPlayers.value));
const summaryLabel = computed(() => (isTeamView.value ? "teams" : "players"));

function teamLabel(match, teamNumber) {
  return match.participants
    .filter((p) => p.teamNumber === teamNumber)
    .map((p) => p.player.nickname || p.player.fullName)
    .join(" + ");
}

function formatTime(timestamp) {
  if (!timestamp) return "—";
  const dt = new Date(timestamp);
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function elapsedTime(startedAt) {
  if (!startedAt) return "—";
  const diffMs = Math.max(0, nowTick.value - new Date(startedAt).getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return `${hours}h ${String(remMinutes).padStart(2, "0")}m`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function statusLabel(status) {
  if (status === "in_match") return "Occupied";
  if (status === "maintenance") return "Maintenance";
  if (status === "available") return "Available";
  return status || "—";
}

function courtStatusClass(court) {
  if (court.status === "maintenance") return "warning";
  if (court.currentMatch || court.status === "in_match" || court.status === "occupied") return "live";
  return "";
}

function winPct(value) {
  const pct = Math.round((value || 0) * 100);
  return `${pct}%`;
}

function rankClass(rank) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "neutral";
}

function rankCornerIcon(rank) {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "⭐";
}

function buildPlayerRows(players) {
  return (players || []).map((player) => ({
    id: player.playerId,
    name: player.player?.nickname || player.player?.fullName || "Player",
    gamesPlayed: player.gamesPlayed || 0,
    wins: player.wins || 0,
    losses: player.losses || 0,
    winPct: player.winPct || 0,
    rank: player.rank || 0
  }));
}

function buildTeamRankings(history) {
  const stats = new Map();
  const nameMap = new Map();
  (history || []).forEach((match) => {
    (match.participants || []).forEach((p) => {
      const name = p.player?.nickname || p.player?.fullName;
      if (p.playerId && name) nameMap.set(p.playerId, name);
    });
  });

  (history || []).forEach((match) => {
    if (match.status !== "ended") return;
    if (match.matchType !== "doubles") return;
    const participants = match.participants || [];
    const team1Ids = participants.filter((p) => p.teamNumber === 1).map((p) => p.playerId).filter(Boolean);
    const team2Ids = participants.filter((p) => p.teamNumber === 2).map((p) => p.playerId).filter(Boolean);
    if (team1Ids.length < 2 || team2Ids.length < 2) return;

    const team1 = getTeamEntry(stats, team1Ids, nameMap);
    const team2 = getTeamEntry(stats, team2Ids, nameMap);

    team1.gamesPlayed += 1;
    team2.gamesPlayed += 1;

    if (match.winnerTeam === 1) {
      team1.wins += 1;
      team2.losses += 1;
    } else if (match.winnerTeam === 2) {
      team2.wins += 1;
      team1.losses += 1;
    }
  });

  const rows = [...stats.values()].map((team) => ({
    ...team,
    winPct: team.gamesPlayed ? team.wins / team.gamesPlayed : 0
  }));

  rows.sort((a, b) => {
    if (b.winPct !== a.winPct) return b.winPct - a.winPct;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return a.name.localeCompare(b.name);
  });

  return rows.map((team, idx) => ({ ...team, rank: idx + 1 }));
}

function buildRoundRobinStandings(rounds, entrantList) {
  const map = new Map();
  const nameMap = new Map();
  (entrantList || []).forEach((entrant) => {
    if (!entrant) return;
    if (typeof entrant === "string") {
      nameMap.set(entrant, entrant);
      map.set(entrant, initStanding(entrant, entrant));
      return;
    }
    const id = entrant.id;
    if (!id) return;
    const name = entrant.name || "Team";
    nameMap.set(id, name);
    map.set(id, initStanding(id, name));
  });

  rounds.forEach((round) => {
    round.matchs.forEach((match) => {
      const team1 = match.team1;
      const team2 = match.team2;
      if (!team1?.id || !team2?.id) return;
      if (!map.has(team1.id)) {
        map.set(team1.id, initStanding(team1.id, team1.name || nameMap.get(team1.id) || "Team"));
      }
      if (!map.has(team2.id)) {
        map.set(team2.id, initStanding(team2.id, team2.name || nameMap.get(team2.id) || "Team"));
      }
      const score1 = roundRobinScore(match, 1);
      const score2 = roundRobinScore(match, 2);
      const hasScore = score1 != null || score2 != null;
      const hasWinner = Boolean(match.winner);
      if (!hasScore && !hasWinner) return;

      const team1Stats = map.get(team1.id);
      const team2Stats = map.get(team2.id);
      team1Stats.gamesPlayed += 1;
      team2Stats.gamesPlayed += 1;

      if (score1 != null && score2 != null) {
        team1Stats.pointsFor += score1;
        team1Stats.pointsAgainst += score2;
        team2Stats.pointsFor += score2;
        team2Stats.pointsAgainst += score1;
      }

      if (match.winner === team1.id) {
        team1Stats.wins += 1;
        team2Stats.losses += 1;
        return;
      }
      if (match.winner === team2.id) {
        team2Stats.wins += 1;
        team1Stats.losses += 1;
        return;
      }
      if (score1 != null && score2 != null) {
        if (score1 > score2) {
          team1Stats.wins += 1;
          team2Stats.losses += 1;
        } else if (score2 > score1) {
          team2Stats.wins += 1;
          team1Stats.losses += 1;
        }
      }
    });
  });

  const rows = [...map.values()].map((team) => ({
    ...team,
    winPct: team.gamesPlayed ? team.wins / team.gamesPlayed : 0
  }));

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
    return a.name.localeCompare(b.name);
  });

  return rows.map((team, idx) => ({ ...team, rank: idx + 1 }));
}

function initStanding(id, name) {
  return {
    id,
    name,
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    winPct: 0,
    rank: 0
  };
}

function getTeamEntry(stats, memberIds, nameMap) {
  const key = teamKey(memberIds);
  if (stats.has(key)) return stats.get(key);
  const names = memberIds
    .map((id) => nameMap.get(id) || "Player")
    .sort((a, b) => a.localeCompare(b));
  const entry = {
    id: key,
    name: names.join(" + "),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    winPct: 0,
    rank: 0
  };
  stats.set(key, entry);
  return entry;
}

async function load() {
  try {
    data.value = await api.publicQueue(route.params.token);
    const defaultType = data.value?.session?.defaultBracketType;
    if (defaultType) {
      bracketType.value = defaultType;
    }
  } catch {
    data.value = {};
  }

  try {
    const rankingData = await api.publicQueueRankings(route.params.token);
    rankedPlayers.value = rankingData.players || [];
    totalPlayers.value = rankingData.totalPlayers || 0;
  } catch {
    rankedPlayers.value = [];
    totalPlayers.value = 0;
  }
}

function openRankings() {
  showRankingsModal.value = true;
  if (isTeamView.value) {
    loadTeamRankMatches();
  }
}

function closeRankings() {
  showRankingsModal.value = false;
}

async function loadTeamRankMatches() {
  if (!showTeamToggle.value) return;
  teamRankLoading.value = true;
  try {
    const result = await api.publicQueueBracket(route.params.token);
    teamRankMatches.value = result.matches || [];
  } catch {
    teamRankMatches.value = [];
  } finally {
    teamRankLoading.value = false;
  }
}

async function openBracket() {
  showBracketModal.value = true;
  bracketLoading.value = true;
  bracketError.value = "";
  try {
    const result = await api.publicQueueBracket(route.params.token);
    bracketSession.value = result.session || null;
    bracketPlayers.value = result.players || [];
    bracketMatches.value = result.matches || [];
    bracketOverrides.value = result.overrides || [];
    const defaultType = result.session?.defaultBracketType || data.value?.session?.defaultBracketType;
    if (defaultType) {
      bracketType.value = defaultType;
    }
  } catch (err) {
    bracketSession.value = null;
    bracketPlayers.value = [];
    bracketMatches.value = [];
    bracketOverrides.value = [];
    bracketError.value = err.message || "Unable to load bracket";
  } finally {
    bracketLoading.value = false;
  }
}

function closeBracket() {
  showBracketModal.value = false;
}

function buildSingleElimination(players) {
  const size = nextPow2(players.length);
  const padded = [...players];
  while (padded.length < size) padded.push("BYE");

  const rounds = [];
  let roundIndex = 1;
  let matchIndex = 1;

  let currentMatches = [];
  for (let i = 0; i < padded.length; i += 2) {
    const matchId = `r${roundIndex}m${matchIndex++}`;
    currentMatches.push(createMatch(matchId, padded[i], padded[i + 1]));
  }
  rounds.push({ name: `Round ${roundIndex}`, matchs: currentMatches });

  let matchCount = currentMatches.length;
  while (matchCount > 1) {
    roundIndex += 1;
    const nextMatches = [];
    const nextCount = Math.ceil(matchCount / 2);
    for (let i = 0; i < nextCount; i += 1) {
      const matchId = `r${roundIndex}m${matchIndex++}`;
      nextMatches.push(
        createMatch(matchId, `Winner of Match ${i * 2 + 1}`, `Winner of Match ${i * 2 + 2}`)
      );
    }
    rounds.push({ name: `Round ${roundIndex}`, matchs: nextMatches });
    matchCount = nextMatches.length;
  }

  return rounds;
}

function buildDoubleElimination(players) {
  const winners = buildSingleElimination(players);
  const losers = [];
  let loserRoundIndex = 1;
  let loserMatchId = 1;

  for (let wRound = 1; wRound < winners.length; wRound += 1) {
    const winnersMatches = winners[wRound - 1].matchs.length;
    const losersMatchCount = Math.max(1, Math.floor(winnersMatches / 2));

    const l1Matches = [];
    for (let m = 1; m <= losersMatchCount; m += 1) {
      const matchId = `l${loserRoundIndex}m${loserMatchId++}`;
      l1Matches.push(
        createMatch(matchId, `Loser of W${wRound} M${m * 2 - 1}`, `Loser of W${wRound} M${m * 2}`)
      );
    }
    losers.push({ name: `Losers R${loserRoundIndex}`, matchs: l1Matches });
    loserRoundIndex += 1;

    const l2Matches = [];
    for (let m = 1; m <= losersMatchCount; m += 1) {
      const matchId = `l${loserRoundIndex}m${loserMatchId++}`;
      l2Matches.push(
        createMatch(matchId, `Winner of L${loserRoundIndex - 1} M${m}`, `Loser of W${wRound + 1} M${m}`)
      );
    }
    losers.push({ name: `Losers R${loserRoundIndex}`, matchs: l2Matches });
    loserRoundIndex += 1;
  }

  return {
    type: "double",
    winners,
    losers,
    finals: losers.length
      ? [
          {
            name: "Grand Final",
            matchs: [
              createMatch(
                "grand-final",
                `Winner of W${winners.length} M1`,
                `Winner of L${loserRoundIndex - 1} M1`
              )
            ]
          }
        ]
      : []
  };
}

function buildRoundRobin(players) {
  const list = [...players];
  const isOdd = list.length % 2 === 1;
  if (isOdd) list.push("BYE");
  const rounds = [];
  const totalRounds = list.length - 1;
  const half = list.length / 2;

  const rotation = [...list];
  for (let round = 0; round < totalRounds; round += 1) {
    const matches = [];
    for (let i = 0; i < half; i += 1) {
      const a = rotation[i];
      const b = rotation[rotation.length - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        matches.push(createMatch(`rr${round + 1}m${i + 1}`, a, b));
      }
    }
    rounds.push({ name: `Round ${round + 1}`, matchs: matches });

    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop());
    rotation.splice(0, rotation.length, fixed, ...rest);
  }

  return rounds;
}

function createMatch(id, teamA, teamB) {
  return {
    id,
    team1: createTeam(teamA, `${id}-a`),
    team2: createTeam(teamB, `${id}-b`)
  };
}

function createTeam(team, fallbackId) {
  if (!team) return undefined;
  if (typeof team === "string") {
    return {
      id: fallbackId,
      name: team,
      disabled: team === "BYE"
    };
  }
  return {
    id: team.id,
    name: team.name,
    disabled: team.disabled || false
  };
}

function buildTeamEntrants(players, customTeams) {
  const teams = [];
  const normalizedCustom = customTeams.map((team) => ({
    ...team,
    source: team.source || "manual"
  }));
  const assigned = new Set(normalizedCustom.flatMap((team) => team.memberIds || []));
  if (normalizedCustom.length) {
    teams.push(...normalizedCustom);
  }
  const remaining = players.filter((player) => !assigned.has(player.id));
  for (let i = 0; i < remaining.length; i += 2) {
    const first = remaining[i];
    const second = remaining[i + 1];
    if (!first) break;
    if (second) {
      const memberIds = [first.id, second.id];
      teams.push(buildTeam(memberIds, `${first.name} + ${second.name}`, { source: "auto" }));
    } else {
      const memberIds = [first.id];
      teams.push(
        buildTeam(memberIds, `${first.name} + BYE`, {
          disabled: true,
          source: "auto",
          teamKeyOverride: teamKey([first.id, `bye-${first.id}`])
        })
      );
    }
  }
  return teams;
}

function buildTeam(memberIds, name, options = {}) {
  return {
    id: options.teamKeyOverride || teamKey(memberIds),
    name,
    memberIds,
    disabled: Boolean(options.disabled),
    source: options.source
  };
}

function nextPow2(value) {
  let size = 1;
  while (size < value) size *= 2;
  return size;
}

function applyMatchResults(rounds, propagateWinners = false) {
  const results = bracketMatchResults.value;
  const validKeys = bracketEntrantKeys.value;
  const overrides = bracketOverrideMap.value;
  for (let roundIndex = 0; roundIndex < rounds.length; roundIndex += 1) {
    const round = rounds[roundIndex];
    round.matchs.forEach((match) => {
      if (results && results.size && validKeys.size) {
        applyResultToMatch(match, results, validKeys);
      }
      applyManualOverride(match, overrides);
    });
    if (!propagateWinners || roundIndex === rounds.length - 1) continue;
    const nextRound = rounds[roundIndex + 1];
    if (!nextRound?.matchs?.length) continue;
    for (let i = 0; i < nextRound.matchs.length; i += 1) {
      const sourceA = round.matchs[i * 2];
      const sourceB = round.matchs[i * 2 + 1];
      const winnerA = winnerTeam(sourceA);
      const winnerB = winnerTeam(sourceB);
      if (winnerA) nextRound.matchs[i].team1 = { ...winnerA, score: undefined };
      if (winnerB) nextRound.matchs[i].team2 = { ...winnerB, score: undefined };
    }
  }
  return rounds;
}

function roundRobinScore(match, side) {
  if (side !== 1 && side !== 2) return null;
  if (match?.team1?.score != null || match?.team2?.score != null) {
    return side === 1 ? match?.team1?.score ?? null : match?.team2?.score ?? null;
  }
  const teamAKey = resolveMatchKey(match?.team1, bracketEntrantKeys.value);
  const teamBKey = resolveMatchKey(match?.team2, bracketEntrantKeys.value);
  if (!teamAKey || !teamBKey) return null;
  const result = bracketMatchResults.value.get(`${teamAKey}|${teamBKey}`);
  if (!result?.score) return null;
  return side === 1 ? result.score.team1 ?? null : result.score.team2 ?? null;
}

function applyResultToMatch(match, results, validKeys) {
  const team1Key = teamKeyFromMatch(match?.team1, validKeys);
  const team2Key = teamKeyFromMatch(match?.team2, validKeys);
  if (!team1Key || !team2Key) return;
  const result = results.get(`${team1Key}|${team2Key}`);
  if (!result) return;
  if (result.score) {
    if (result.score.team1 != null) match.team1.score = result.score.team1;
    if (result.score.team2 != null) match.team2.score = result.score.team2;
  }
  if (result.winnerTeam === 1) {
    match.winner = match.team1.id;
  } else if (result.winnerTeam === 2) {
    match.winner = match.team2.id;
  }
}

function applyManualOverride(match, overrides) {
  if (!match?.id) return;
  const override = overrides[match.id];
  if (!override) return;
  if (override.score) {
    if (override.score.team1 != null && match.team1) match.team1.score = override.score.team1;
    if (override.score.team2 != null && match.team2) match.team2.score = override.score.team2;
  }
  if ("winnerId" in override) {
    match.winner = override.winnerId || undefined;
  }
}

function winnerTeam(match) {
  if (!match?.winner) return null;
  if (match.team1?.id === match.winner) return match.team1;
  if (match.team2?.id === match.winner) return match.team2;
  return null;
}

function teamKeyFromMatch(team, validKeys) {
  if (!team?.id || !validKeys.has(team.id)) return null;
  return team.id;
}

function resolveMatchKey(team, validKeys) {
  if (!team?.id) return null;
  if (!validKeys || !validKeys.size) return team.id;
  if (validKeys.has(team.id)) return team.id;
  if (Array.isArray(team.memberIds) && team.memberIds.length) {
    return team.memberIds.slice().sort().join("+");
  }
  return team.id;
}

function buildMatchResults(history) {
  const results = new Map();
  (history || []).forEach((match) => {
    if (match.status !== "ended") return;
    const team1Ids = match.participants
      .filter((p) => p.teamNumber === 1)
      .map((p) => p.playerId || p.player?.id)
      .filter(Boolean);
    const team2Ids = match.participants
      .filter((p) => p.teamNumber === 2)
      .map((p) => p.playerId || p.player?.id)
      .filter(Boolean);
    if (!team1Ids.length || !team2Ids.length) return;
    const key1 = teamKey(team1Ids);
    const key2 = teamKey(team2Ids);
    const score = extractScore(match.scoreJson);
    const winnerTeam = match.winnerTeam ?? null;
    results.set(`${key1}|${key2}`, { score, winnerTeam });
    results.set(`${key2}|${key1}`, {
      score: score ? { team1: score.team2, team2: score.team1 } : null,
      winnerTeam: winnerTeam === 1 ? 2 : winnerTeam === 2 ? 1 : null
    });
  });
  return results;
}

function teamKey(ids) {
  return ids.slice().sort().join("+");
}

watch(rankMode, (next) => {
  if (next === "teams" && showTeamToggle.value) {
    loadTeamRankMatches();
  }
});

watch(
  () => data.value?.session?.gameType,
  (gameType) => {
    if (gameType !== "doubles") {
      rankMode.value = "players";
    }
  }
);

function extractScore(scoreJson) {
  if (!scoreJson) return null;
  if (Array.isArray(scoreJson)) {
    if (scoreJson.length === 2 && scoreJson.every((v) => typeof v === "number")) {
      return { team1: scoreJson[0], team2: scoreJson[1] };
    }
    if (scoreJson.every((v) => Array.isArray(v) && v.length >= 2)) {
      const totals = scoreJson.reduce(
        (acc, set) => {
          const [a, b] = set;
          return {
            team1: acc.team1 + (Number(a) || 0),
            team2: acc.team2 + (Number(b) || 0)
          };
        },
        { team1: 0, team2: 0 }
      );
      return totals;
    }
  }
  if (typeof scoreJson === "object") {
    const value = (key) => {
      const raw = scoreJson?.[key];
      const num = Number(raw);
      return Number.isFinite(num) ? num : undefined;
    };
    const team1 =
      value("team1") ??
      value("teamA") ??
      value("score1") ??
      value("home") ??
      value("a");
    const team2 =
      value("team2") ??
      value("teamB") ??
      value("score2") ??
      value("away") ??
      value("b");
    if (team1 != null || team2 != null) {
      return { team1, team2 };
    }
    if (Array.isArray(scoreJson.scores) && scoreJson.scores.length >= 2) {
      const [a, b] = scoreJson.scores;
      const team1Score = Number(a);
      const team2Score = Number(b);
      if (Number.isFinite(team1Score) || Number.isFinite(team2Score)) {
        return {
          team1: Number.isFinite(team1Score) ? team1Score : undefined,
          team2: Number.isFinite(team2Score) ? team2Score : undefined
        };
      }
      return null;
    }
    if (Array.isArray(scoreJson.sets) && scoreJson.sets.length) {
      const totals = scoreJson.sets.reduce(
        (acc, set) => {
          const a = Number(set?.team1 ?? set?.teamA ?? set?.score1 ?? set?.a ?? 0);
          const b = Number(set?.team2 ?? set?.teamB ?? set?.score2 ?? set?.b ?? 0);
          return {
            team1: acc.team1 + (Number.isFinite(a) ? a : 0),
            team2: acc.team2 + (Number.isFinite(b) ? b : 0)
          };
        },
        { team1: 0, team2: 0 }
      );
      return totals;
    }
  }
  return null;
}

function onTouchStart(e) {
  if (window.scrollY === 0) {
    startY.value = e.touches[0].clientY;
  }
}

function onTouchMove(e) {
  if (window.scrollY !== 0) return;
  const delta = e.touches[0].clientY - startY.value;
  if (delta > 30) {
    isPulling.value = true;
  }
}

async function onTouchEnd(e) {
  const delta = e.changedTouches[0].clientY - startY.value;
  if (delta > 60 && !refreshing.value) {
    refreshing.value = true;
    await load();
    refreshing.value = false;
  }
  isPulling.value = false;
}

onMounted(() => {
  load();
  timerId = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
});
</script>
