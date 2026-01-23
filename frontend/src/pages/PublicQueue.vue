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
      <div v-for="court in data.courts || []" :key="court.court.id" class="queue-court-card">
        <div class="queue-court-head">
          <strong>{{ court.court.name }}</strong>
          <span class="queue-status-pill" :class="court.status">{{ statusLabel(court.status) }}</span>
        </div>
        <div class="queue-court-body">
          <div v-if="court.currentMatch" class="queue-now-vs">
            <span class="queue-now-pill team-a">{{ teamLabel(court.currentMatch, 1) }}</span>
            <span class="queue-now-divider">vs</span>
            <span class="queue-now-pill team-b">{{ teamLabel(court.currentMatch, 2) }}</span>
          </div>
          <span v-else class="subtitle">Open</span>
          <div v-if="court.currentMatch" class="queue-time-row">
            <span>Started {{ formatTime(court.currentMatch.startedAt) }}</span>
            <span>Elapsed {{ elapsedTime(court.currentMatch.startedAt) }}</span>
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
        <span class="queue-section-badge">{{ totalPlayers }} players</span>
      </div>
      <div v-if="rankedPlayers.length === 0" class="subtitle">No stats yet.</div>
      <div v-else class="rank-modal-body">
        <div v-for="player in rankedPlayers" :key="player.playerId" class="rank-card">
          <div class="rank-left">
            <div class="rank-badge" :class="rankClass(player.rank)">{{ player.rank }}</div>
            <div>
              <strong>{{ player.player.nickname || player.player.fullName }}</strong>
            </div>
          </div>
          <div class="rank-stats">
            <div class="rank-pill">GP {{ player.gamesPlayed }}</div>
            <div class="rank-pill win">W {{ player.wins }}</div>
            <div class="rank-pill loss">L {{ player.losses }}</div>
            <div class="rank-pill pct">{{ winPct(player.winPct) }}</div>
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
            <div v-for="round in bracketData.rounds" :key="round.name" class="round-robin-round">
              <div class="subtitle">{{ round.name }}</div>
              <div class="stack">
                <div v-for="match in round.matchs" :key="match.id" class="match-card simple">
                  <div class="match-line">{{ match.team1?.name || "-" }}</div>
                  <div class="match-line">{{ match.team2?.name || "-" }}</div>
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
import { computed, onMounted, onUnmounted, ref } from "vue";
import { TournamentBracket } from "vue3-tournament";
import "vue3-tournament/style.css";
import { api } from "../api.js";
import { useRoute } from "vue-router";

const route = useRoute();
const data = ref({});
const rankedPlayers = ref([]);
const totalPlayers = ref(0);
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

const bracketEntrants = computed(() => {
  if (bracketMatchFormat.value === "doubles") {
    return buildTeamEntrants(bracketJoinedPlayers.value, []);
  }
  return bracketJoinedPlayers.value;
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

async function load() {
  try {
    data.value = await api.publicQueue(route.params.token);
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
}

function closeRankings() {
  showRankingsModal.value = false;
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
