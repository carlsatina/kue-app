<template>
  <div class="page-grid with-sidebar bracket-page">
    <div class="page-main stack">
      <div v-if="session" class="card stack live-surface">
        <div class="subtitle compact">
          Tip: click a team to advance it. Click a match to edit scores or winner.
        </div>
        <div v-if="overrideError" class="notice">{{ overrideError }}</div>
        <div v-if="!bracketData || bracketData.error" class="subtitle">
          {{ bracketData?.error || "Select a bracket type to generate." }}
        </div>
        <div v-else ref="bracketRef" class="bracket-surface">
          <div v-if="bracketType === 'single'" class="tournament-bracket">
            <TournamentBracket
              v-bind="bracketVisuals"
              :rounds="bracketData.rounds"
              @onMatchClick="openMatchEditor"
              @onParticipantClick="advanceFromClick"
            />
          </div>

          <div v-else-if="bracketType === 'double'" class="tournament-bracket-stack">
            <div class="tournament-bracket-block">
              <div class="subtitle">Winners Bracket</div>
              <div class="tournament-bracket">
                <TournamentBracket
                  v-bind="bracketVisuals"
                  :rounds="bracketData.winners"
                  @onMatchClick="openMatchEditor"
                  @onParticipantClick="advanceFromClick"
                />
              </div>
            </div>
            <div v-if="bracketData.losers?.length" class="tournament-bracket-block">
              <div class="subtitle">Losers Bracket</div>
              <div class="tournament-bracket">
                <TournamentBracket
                  v-bind="bracketVisuals"
                  :rounds="bracketData.losers"
                  @onMatchClick="openMatchEditor"
                  @onParticipantClick="advanceFromClick"
                />
              </div>
            </div>
            <div v-if="bracketData.finals?.length" class="tournament-bracket-block">
              <div class="subtitle">Grand Final</div>
              <div class="tournament-bracket">
                <TournamentBracket
                  v-bind="bracketVisuals"
                  :rounds="bracketData.finals"
                  @onMatchClick="openMatchEditor"
                  @onParticipantClick="advanceFromClick"
                />
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
          <button
            class="icon-button fullscreen-button"
            @click="toggleFullscreen"
            :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          >
            <svg v-if="!isFullscreen" viewBox="0 0 24 24" role="img">
              <path d="M4 9V4h5v2H6v3H4zm10-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm13 3v-3h2v5h-5v-2h3z"></path>
            </svg>
            <svg v-else viewBox="0 0 24 24" role="img">
              <path d="M6 6h3V4H4v5h2V6zm9 0v3h2V4h-5v2h3zM6 18v-3H4v5h5v-2H6zm11-3h-2v3h-3v2h5v-5z"></path>
            </svg>
          </button>
        </div>
      </div>
      <div v-else class="card live-surface">
        <div class="subtitle">Open a session to generate a bracket.</div>
      </div>
    </div>

    <div class="page-side stack">
      <div class="card stack live-surface print-hidden tournament-card">
        <div class="tournament-head">
          <div>
            <div class="section-title">Tournament</div>
            <div class="subtitle compact">Manage bracket settings</div>
          </div>
        </div>
        <div v-if="!session" class="subtitle">No active session.</div>
        <div v-else class="tournament-body">
          <div class="tournament-block">
            <label class="field-label">Bracket type</label>
            <div class="tournament-row">
              <select class="input" v-model="bracketType">
                <option value="single">Single Elimination</option>
                <option value="double">Double Elimination</option>
                <option value="round_robin">Round Robin</option>
              </select>
              <label class="radio-row default-bracket-toggle">
                <input
                  type="checkbox"
                  v-model="defaultBracketEnabled"
                  :disabled="!session"
                  @change="handleDefaultToggle"
                />
                Default
              </label>
            </div>
          </div>

          <div class="tournament-stats">
            <div class="tournament-stat">
              <div class="subtitle">Players</div>
              <strong>{{ joinedPlayers.length }}</strong>
            </div>
            <div v-if="matchFormat === 'doubles'" class="tournament-stat">
              <div class="subtitle">Teams</div>
              <strong>{{ entrants.length }}</strong>
            </div>
            <div class="tournament-stat">
              <div class="subtitle">Game type</div>
              <strong>{{ matchFormatLabel }}</strong>
            </div>
          </div>

          <div v-if="session && matchFormat === 'singles'" class="tournament-tool">
            <div>
              <div class="subtitle">Seeding</div>
              <strong>{{ seedOrderActive ? "Manual" : "Join order" }}</strong>
            </div>
            <button class="button ghost button-compact" @click="openSeedModal">Arrange</button>
          </div>
          <div v-if="session && matchFormat === 'doubles'" class="tournament-tool vertical">
            <div>
              <div class="subtitle">Team Builder</div>
              <strong>{{ manualTeams.length }} manual teams</strong>
            </div>
            <router-link class="button button-compact blue-gradient no-wrap" to="/team-builder">
              Open Team Builder
            </router-link>
          </div>

          <div class="tournament-actions">
            <button class="button ghost button-compact" @click="load">Refresh</button>
            <button class="button button-compact" @click="printBracket">Print</button>
            <button class="button ghost button-compact" @click="exportBracket">Export JSON</button>
          </div>
          <div v-if="error" class="notice">{{ error }}</div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="showMatchEditor" class="modal-backdrop">
    <div class="modal-card match-modal">
      <div class="match-modal-head">
        <div>
          <div class="subtitle">Edit match</div>
          <h3>Update Result</h3>
        </div>
        <span class="match-burst">🏆</span>
      </div>
      <div class="winner-grid">
        <div class="winner-card team-a">
          <div class="subtitle">Team A</div>
          <strong>{{ editTeamA?.name || "—" }}</strong>
        </div>
        <div class="winner-card team-b">
          <div class="subtitle">Team B</div>
          <strong>{{ editTeamB?.name || "—" }}</strong>
        </div>
      </div>
      <div class="grid two score-inputs">
        <div class="field">
          <label class="field-label">Team A score</label>
          <input class="input" type="number" min="0" v-model="editScoreA" placeholder="Score" />
        </div>
        <div class="field">
          <label class="field-label">Team B score</label>
          <input class="input" type="number" min="0" v-model="editScoreB" placeholder="Score" />
        </div>
      </div>
      <div class="grid two">
        <button
          class="button ghost button-compact"
          :class="{ active: editWinnerId === editTeamA?.id }"
          @click="selectWinner(editTeamA?.id)"
          :disabled="!editTeamA"
        >
          Team A Wins
        </button>
        <button
          class="button ghost button-compact"
          :class="{ active: editWinnerId === editTeamB?.id }"
          @click="selectWinner(editTeamB?.id)"
          :disabled="!editTeamB"
        >
          Team B Wins
        </button>
      </div>
      <div class="grid two">
        <button class="button ghost button-compact" @click="selectWinner(null)">No Winner</button>
        <button class="button ghost button-compact" @click="clearMatchOverride">Clear Override</button>
      </div>
      <div class="grid two">
        <button class="button" @click="saveMatchEdit">Save</button>
        <button class="button ghost" @click="closeMatchEditor">Cancel</button>
      </div>
    </div>
  </div>
  <div v-if="showSeedModal" class="modal-backdrop">
    <div class="modal-card">
      <h3>Arrange Singles Seeds</h3>
      <div class="subtitle">Reorder players to set bracket seeding.</div>
      <div class="seed-list">
        <div
          v-for="(playerId, index) in seedDraftIds"
          :key="playerId"
          class="seed-row"
          :data-index="index"
          :class="{ dragging: seedDraggingIndex === index, hover: seedHoverIndex === index }"
        >
          <div class="seed-handle" aria-hidden="true" @pointerdown.prevent="onSeedPointerDown(index, $event)">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M7 5h2v2H7V5zm8 0h2v2h-2V5zM7 11h2v2H7v-2zm8 0h2v2h-2v-2zM7 17h2v2H7v-2zm8 0h2v2h-2v-2z"></path>
            </svg>
          </div>
          <div class="seed-index">{{ index + 1 }}</div>
          <div class="seed-name">{{ seedName(playerId) }}</div>
        </div>
      </div>
      <div class="grid two">
        <button class="button ghost" @click="closeSeedModal">Cancel</button>
        <button class="button" @click="saveSeedOrder">Save</button>
      </div>
      <button class="button ghost button-compact" @click="useJoinOrder">Use join order</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { TournamentBracket } from "vue3-tournament";
import "vue3-tournament/style.css";
import { api } from "../api.js";
import { loadManualTeams, saveManualTeams } from "../utils/teamBuilder.js";
import { SEED_MATCH_ID, applySeedOrder, extractSeedOrder } from "../utils/seedOrder.js";
import { selectedSessionId, setSelectedSessionId } from "../state/sessionStore.js";

const session = ref(null);
const sessionPlayers = ref([]);
const matches = ref([]);
const error = ref("");
const matchFormat = computed(() => session.value?.gameType || "doubles");
const matchFormatLabel = computed(() =>
  matchFormat.value === "singles" ? "Singles" : "Doubles"
);
const bracketType = ref("single");
const manualTeams = ref([]);
let refreshTimer = null;
const manualOverrides = ref({});
const overrideError = ref("");
const bracketRef = ref(null);
const isFullscreen = ref(false);
const defaultBracketEnabled = ref(false);
const showMatchEditor = ref(false);
const editMatchId = ref("");
const editTeamA = ref(null);
const editTeamB = ref(null);
const editScoreA = ref("");
const editScoreB = ref("");
const editWinnerId = ref(null);
const showSeedModal = ref(false);
const seedDraftIds = ref([]);
const seedOrderIds = ref([]);
const seedDraggingIndex = ref(null);
const seedHoverIndex = ref(null);
const seedBracketTypes = ["single", "double", "round_robin"];
let seedDragState = null;
const DEFAULT_BRACKET_STORAGE_KEY = "kue:bracket-default:";

const bracketVisuals = {
  format: "default",
  textColor: "#1f1c17",
  titleColor: "#5b5248",
  teamBackgroundColor: "transparent",
  highlightTeamBackgroundColor: "rgba(15, 157, 138, 0.08)",
  scoreBackgroundColor: "#5c9cff",
  winnerScoreBackgroundColor: "#5c9cff"
};

const joinedPlayers = computed(() => {
  return sessionPlayers.value
    .filter((sp) => sp.status !== "done")
    .sort((a, b) => new Date(a.checkedInAt) - new Date(b.checkedInAt))
    .map((sp) => ({
      id: sp.player.id,
      name: sp.player.nickname || sp.player.fullName
    }));
});

const seededPlayers = computed(() => applySeedOrder(joinedPlayers.value, seedOrderIds.value));

const entrants = computed(() => {
  if (matchFormat.value === "doubles") {
    return buildTeamEntrants(joinedPlayers.value, manualTeams.value);
  }
  return seededPlayers.value;
});

const entrantKeys = computed(() => {
  const keys = entrants.value
    .map((entrant) => (typeof entrant === "string" ? entrant : entrant?.id))
    .filter(Boolean);
  return new Set(keys);
});

const matchResults = computed(() => buildMatchResults(matches.value));
const seedOrderActive = computed(() => seedOrderIds.value.length > 0);
const roundRobinStandings = computed(() => {
  if (bracketType.value !== "round_robin") return [];
  if (!bracketData.value?.rounds) return [];
  return buildRoundRobinStandings(bracketData.value.rounds, entrants.value);
});

const bracketData = computed(() => {
  if (!session.value) return null;
  if (entrants.value.length < 2) {
    const label = matchFormat.value === "doubles" ? "teams" : "players";
    return { error: `At least 2 ${label} are required.` };
  }
  if (bracketType.value === "single") {
    return {
      type: "single",
      rounds: applyMatchResults(buildSingleElimination(entrants.value), true)
    };
  }
  if (bracketType.value === "double") {
    const data = buildDoubleElimination(entrants.value);
    return {
      ...data,
      winners: applyMatchResults(data.winners, true),
      losers: applyMatchResults(data.losers),
      finals: applyMatchResults(data.finals)
    };
  }
  return {
    type: "round_robin",
    rounds: applyMatchResults(buildRoundRobin(entrants.value))
  };
});

async function load() {
  error.value = "";
  try {
    let currentSession = null;
    if (selectedSessionId.value) {
      currentSession = await api.session(selectedSessionId.value);
    } else {
      currentSession = await api.activeSession();
      if (currentSession?.id) setSelectedSessionId(currentSession.id);
    }
    session.value = currentSession;
    if (!currentSession) {
      sessionPlayers.value = [];
      matches.value = [];
      manualOverrides.value = {};
      manualTeams.value = [];
      seedOrderIds.value = [];
      return;
    }
    sessionPlayers.value = await api.sessionPlayers(currentSession.id);
    matches.value = await api.matchHistory(currentSession.id);
    manualTeams.value = loadManualTeams(currentSession.id);
    await loadOverrides();
  } catch (err) {
    error.value = err.message || "Unable to load session";
    session.value = null;
    sessionPlayers.value = [];
    matches.value = [];
    manualOverrides.value = {};
    manualTeams.value = [];
    seedOrderIds.value = [];
  }
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
  const results = matchResults.value;
  const validKeys = entrantKeys.value;
  const overrides = manualOverrides.value;
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

function roundRobinScore(match, side) {
  if (side !== 1 && side !== 2) return null;
  if (match?.team1?.score != null || match?.team2?.score != null) {
    return side === 1 ? match?.team1?.score ?? null : match?.team2?.score ?? null;
  }
  const teamAKey = resolveMatchKey(match?.team1, entrantKeys.value);
  const teamBKey = resolveMatchKey(match?.team2, entrantKeys.value);
  if (!teamAKey || !teamBKey) return null;
  const result = matchResults.value.get(`${teamAKey}|${teamBKey}`);
  if (!result?.score) return null;
  return side === 1 ? result.score.team1 ?? null : result.score.team2 ?? null;
}

function handleDefaultToggle() {
  if (!session.value?.id) return;
  if (defaultBracketEnabled.value) {
    saveDefaultBracket(session.value.id, bracketType.value);
    persistDefaultBracket(bracketType.value);
  } else {
    clearDefaultBracket(session.value.id);
    persistDefaultBracket(null);
  }
}

function saveDefaultBracket(sessionId, type) {
  if (!sessionId || !seedBracketTypes.includes(type)) return;
  try {
    localStorage.setItem(`${DEFAULT_BRACKET_STORAGE_KEY}${sessionId}`, type);
  } catch {
    // ignore storage errors
  }
}

function readDefaultBracket(sessionId) {
  if (!sessionId) return null;
  try {
    const stored = localStorage.getItem(`${DEFAULT_BRACKET_STORAGE_KEY}${sessionId}`);
    return seedBracketTypes.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

function clearDefaultBracket(sessionId) {
  if (!sessionId) return;
  try {
    localStorage.removeItem(`${DEFAULT_BRACKET_STORAGE_KEY}${sessionId}`);
  } catch {
    // ignore storage errors
  }
}

async function persistDefaultBracket(value) {
  if (!session.value?.id) return;
  try {
    await api.updateSession(session.value.id, {
      defaultBracketType: value ?? null
    });
  } catch (err) {
    overrideError.value = err.message || "Unable to save default bracket";
  }
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

function exportBracket() {
  if (!bracketData.value || bracketData.value.error || !session.value) return;
  const payload = {
    session: { id: session.value.id, name: session.value.name },
    type: bracketType.value,
    matchFormat: matchFormat.value,
    players: joinedPlayers.value.map((player) => player.name),
    teams:
      matchFormat.value === "doubles"
        ? entrants.value.map((team) => (typeof team === "string" ? team : team.name))
        : undefined,
    bracket: bracketData.value
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tournament-${session.value.name || "session"}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printBracket() {
  window.print();
}

function handleFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === bracketRef.value;
}

function toggleFullscreen() {
  if (!bracketRef.value) return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
    return;
  }
  bracketRef.value.requestFullscreen?.();
}

async function loadOverrides() {
  if (!session.value) return;
  overrideError.value = "";
  try {
    const overrides = await api.bracketOverrides(session.value.id, {
      matchFormat: matchFormat.value
    });
    const list = overrides || [];
    const map = {};
    list.forEach((override) => {
      if (override.matchId === SEED_MATCH_ID) return;
      if (override.bracketType !== bracketType.value) return;
      map[override.matchId] = {
        winnerId: override.winnerId ?? null,
        score: override.scoreJson ?? null
      };
    });
    manualOverrides.value = map;
    seedOrderIds.value = extractSeedOrder(list, matchFormat.value);
  } catch (err) {
    overrideError.value = err.message || "Unable to load bracket overrides";
  }
}

async function persistOverride(matchId, override) {
  if (!session.value || !matchId) return;
  overrideError.value = "";
  try {
    await api.saveBracketOverride(session.value.id, {
      matchId,
      bracketType: bracketType.value,
      matchFormat: matchFormat.value,
      winnerId: override.winnerId ?? null,
      score: override.score ?? undefined
    });
  } catch (err) {
    overrideError.value = err.message || "Unable to save bracket override";
  }
}

async function removeOverride(matchId) {
  if (!session.value || !matchId) return;
  overrideError.value = "";
  try {
    await api.deleteBracketOverride(session.value.id, {
      matchId,
      bracketType: bracketType.value,
      matchFormat: matchFormat.value
    });
  } catch (err) {
    overrideError.value = err.message || "Unable to clear bracket override";
  }
}

function openSeedModal() {
  seedDraftIds.value = seededPlayers.value.map((player) => player.id);
  showSeedModal.value = true;
}

function closeSeedModal() {
  showSeedModal.value = false;
  seedDraftIds.value = [];
  cleanupSeedDrag();
}

function seedName(playerId) {
  const player = joinedPlayers.value.find((item) => item.id === playerId);
  return player ? player.name : "Unknown";
}

function onSeedPointerDown(index, event) {
  if (!seedDraftIds.value[index]) return;
  const row = event.currentTarget?.closest?.(".seed-row") || event.currentTarget;
  if (!row) return;
  const rect = row.getBoundingClientRect();
  const ghost = row.cloneNode(true);
  ghost.classList.add("seed-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.appendChild(ghost);

  seedDragState = {
    originIndex: index,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    ghost,
    element: row
  };
  seedDraggingIndex.value = index;
  seedHoverIndex.value = index;

  try {
    row.setPointerCapture(event.pointerId);
  } catch {
    // ignore capture errors
  }

  updateSeedGhostPosition(event.clientX, event.clientY);
  window.addEventListener("pointermove", onSeedPointerMove);
  window.addEventListener("pointerup", onSeedPointerUp);
  window.addEventListener("pointercancel", onSeedPointerCancel);
}

function onSeedPointerMove(event) {
  if (!seedDragState || event.pointerId !== seedDragState.pointerId) return;
  if (!seedDragState.moved) {
    const dx = Math.abs(event.clientX - seedDragState.startX);
    const dy = Math.abs(event.clientY - seedDragState.startY);
    if (dx > 4 || dy > 4) seedDragState.moved = true;
  }
  updateSeedGhostPosition(event.clientX, event.clientY);
  const index = seedIndexFromPoint(event.clientX, event.clientY);
  if (index != null) seedHoverIndex.value = index;
}

function onSeedPointerUp(event) {
  const state = seedDragState;
  if (!state || event.pointerId !== state.pointerId) return;
  const originIndex = state.originIndex;
  const dropIndex = seedHoverIndex.value;
  const moved = Boolean(state.moved);
  cleanupSeedDrag(event);
  if (!moved || dropIndex == null || dropIndex === originIndex) return;
  const next = seedDraftIds.value.slice();
  const [movedId] = next.splice(originIndex, 1);
  let targetIndex = dropIndex;
  if (originIndex < targetIndex) targetIndex -= 1;
  next.splice(targetIndex, 0, movedId);
  seedDraftIds.value = next;
}

function onSeedPointerCancel(event) {
  if (!seedDragState || event.pointerId !== seedDragState.pointerId) return;
  cleanupSeedDrag(event);
}

function updateSeedGhostPosition(x, y) {
  if (!seedDragState?.ghost) return;
  seedDragState.ghost.style.transform = `translate(${x - seedDragState.offsetX}px, ${
    y - seedDragState.offsetY
  }px)`;
}

function seedIndexFromPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const row = el?.closest?.(".seed-row");
  if (!row) return null;
  const value = Number(row.dataset.index);
  return Number.isFinite(value) ? value : null;
}

function cleanupSeedDrag(event) {
  if (seedDragState?.element && seedDragState.pointerId != null && event?.pointerId != null) {
    try {
      seedDragState.element.releasePointerCapture(seedDragState.pointerId);
    } catch {
      // ignore release errors
    }
  }
  if (seedDragState?.ghost) seedDragState.ghost.remove();
  seedDragState = null;
  seedDraggingIndex.value = null;
  seedHoverIndex.value = null;
  window.removeEventListener("pointermove", onSeedPointerMove);
  window.removeEventListener("pointerup", onSeedPointerUp);
  window.removeEventListener("pointercancel", onSeedPointerCancel);
}

async function saveSeedOrder() {
  if (!session.value) return;
  const nextIds = seedDraftIds.value.filter(Boolean);
  overrideError.value = "";
  try {
    await Promise.all(
      seedBracketTypes.map((type) =>
        api.deleteBracketOverride(session.value.id, {
          matchId: SEED_MATCH_ID,
          bracketType: type,
          matchFormat: matchFormat.value
        })
      )
    );
    await api.saveBracketOverride(session.value.id, {
      matchId: SEED_MATCH_ID,
      bracketType: bracketType.value,
      matchFormat: matchFormat.value,
      winnerId: null,
      score: { seeds: nextIds }
    });
    seedOrderIds.value = nextIds;
    showSeedModal.value = false;
  } catch (err) {
    overrideError.value = err.message || "Unable to save seed order";
  }
}

async function useJoinOrder() {
  if (!session.value) return;
  overrideError.value = "";
  try {
    await Promise.all(
      seedBracketTypes.map((type) =>
        api.deleteBracketOverride(session.value.id, {
          matchId: SEED_MATCH_ID,
          bracketType: type,
          matchFormat: matchFormat.value
        })
      )
    );
    seedOrderIds.value = [];
    closeSeedModal();
  } catch (err) {
    overrideError.value = err.message || "Unable to reset seed order";
  }
}

function openMatchEditor(matchId) {
  if (!matchId) return;
  const match = findMatchById(matchId);
  if (!match) return;
  editMatchId.value = match.id;
  editTeamA.value = match.team1 || null;
  editTeamB.value = match.team2 || null;
  editScoreA.value = match.team1?.score ?? "";
  editScoreB.value = match.team2?.score ?? "";
  editWinnerId.value = match.winner ?? null;
  showMatchEditor.value = true;
}

function closeMatchEditor() {
  showMatchEditor.value = false;
  editMatchId.value = "";
  editTeamA.value = null;
  editTeamB.value = null;
  editScoreA.value = "";
  editScoreB.value = "";
  editWinnerId.value = null;
}

function saveMatchEdit() {
  if (!editMatchId.value) return;
  const scoreA = parseScoreValue(editScoreA.value);
  const scoreB = parseScoreValue(editScoreB.value);
  const override = {};
  if (editWinnerId.value !== undefined) {
    override.winnerId = editWinnerId.value;
  }
  if (scoreA != null || scoreB != null) {
    override.score = {};
    if (scoreA != null) override.score.team1 = scoreA;
    if (scoreB != null) override.score.team2 = scoreB;
  }
  if (!override.winnerId && !override.score) {
    clearMatchOverride();
    return;
  }
  manualOverrides.value = {
    ...manualOverrides.value,
    [editMatchId.value]: override
  };
  persistOverride(editMatchId.value, override);
  closeMatchEditor();
}

function clearMatchOverride() {
  if (!editMatchId.value) return;
  const next = { ...manualOverrides.value };
  delete next[editMatchId.value];
  manualOverrides.value = next;
  removeOverride(editMatchId.value);
  closeMatchEditor();
}

function selectWinner(winnerId) {
  editWinnerId.value = winnerId ?? null;
}

function findMatchById(matchId) {
  if (!bracketData.value) return null;
  const rounds = [];
  if (bracketType.value === "single") {
    rounds.push(...(bracketData.value.rounds || []));
  } else if (bracketType.value === "double") {
    rounds.push(...(bracketData.value.winners || []));
    rounds.push(...(bracketData.value.losers || []));
    rounds.push(...(bracketData.value.finals || []));
  } else {
    rounds.push(...(bracketData.value.rounds || []));
  }
  for (const round of rounds) {
    const found = round.matchs?.find((match) => match.id === matchId);
    if (found) return found;
  }
  return null;
}

function advanceFromClick(participant, match) {
  if (!match?.id || !participant?.id || participant.disabled) return;
  const existing = manualOverrides.value[match.id] || {};
  const inferredScore =
    existing.score ??
    (match.team1?.score != null || match.team2?.score != null
      ? { team1: match.team1?.score, team2: match.team2?.score }
      : undefined);
  const override = { ...existing, winnerId: participant.id, score: inferredScore };
  manualOverrides.value = {
    ...manualOverrides.value,
    [match.id]: override
  };
  persistOverride(match.id, override);
}

function parseScoreValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

watch(joinedPlayers, (players) => {
  const valid = new Set(players.map((player) => player.id));
  manualTeams.value = manualTeams.value.filter((team) =>
    (team.memberIds || []).every((id) => valid.has(id))
  );
});

watch(
  () => manualTeams.value,
  (teams) => {
    if (!session.value?.id) return;
    saveManualTeams(session.value.id, teams);
  },
  { deep: true }
);

watch([bracketType, matchFormat], () => {
  if (session.value) {
    loadOverrides();
  }
  if (matchFormat.value !== "doubles") {
    manualTeams.value = [];
  }
});

watch(joinedPlayers, (players) => {
  if (!seedOrderIds.value.length) return;
  const valid = new Set(players.map((player) => player.id));
  seedOrderIds.value = seedOrderIds.value.filter((id) => valid.has(id));
});

watch(bracketType, (next) => {
  if (!session.value?.id) return;
  if (defaultBracketEnabled.value) {
    saveDefaultBracket(session.value.id, next);
    persistDefaultBracket(next);
  }
});

onMounted(() => {
  load();
  refreshTimer = window.setInterval(load, 20000);
  document.addEventListener("fullscreenchange", handleFullscreenChange);
});

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  cleanupSeedDrag();
});

watch(selectedSessionId, load);

watch(session, (nextSession) => {
  if (!nextSession?.id) {
    defaultBracketEnabled.value = false;
    return;
  }
  const saved = nextSession.defaultBracketType || readDefaultBracket(nextSession.id);
  if (saved) {
    if (bracketType.value !== saved) bracketType.value = saved;
    defaultBracketEnabled.value = true;
    saveDefaultBracket(nextSession.id, saved);
  } else {
    defaultBracketEnabled.value = false;
  }
});

watch(showSeedModal, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (!isOpen) {
    cleanupSeedDrag();
  }
});
</script>
