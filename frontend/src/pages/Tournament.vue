<template>
  <div class="page-grid with-sidebar">
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
      <div class="card stack live-surface print-hidden">
        <div class="section-title">Tournament</div>
        <div v-if="!session" class="subtitle">No active session.</div>
        <div v-else class="grid two">
          <div class="field">
            <label class="field-label">Bracket type</label>
            <select class="input" v-model="bracketType">
              <option value="single">Single Elimination</option>
              <option value="double">Double Elimination</option>
              <option value="round_robin">Round Robin</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label">Joined players</label>
            <div class="subtitle">{{ joinedPlayers.length }}</div>
            <div v-if="matchFormat === 'doubles'" class="subtitle compact">
              Teams: {{ entrants.length }}
            </div>
          </div>
          <div class="field">
            <label class="field-label">Game type</label>
            <div class="subtitle">{{ matchFormatLabel }}</div>
          </div>
        </div>
        <div v-if="session && matchFormat === 'doubles'" class="team-builder stack">
          <div class="team-builder-head">
            <div>
              <div class="subtitle">Team Builder</div>
              <div class="subtitle compact">Select 2 players to create a team.</div>
            </div>
            <div class="team-builder-actions">
              <button class="button ghost button-compact" @click="autoPairTeams">Auto Pair</button>
              <button class="button ghost button-compact" @click="clearTeams">Reset</button>
            </div>
          </div>
          <div class="team-builder-grid">
            <div class="team-builder-panel">
              <div class="subtitle compact">Players</div>
              <div class="team-builder-list">
                <button
                  v-for="player in joinedPlayers"
                  :key="player.id"
                  class="team-player"
                  :class="{
                    selected: selectedTeamPlayers.includes(player.id),
                    assigned: assignedPlayerIds.has(player.id)
                  }"
                  :disabled="assignedPlayerIds.has(player.id)"
                  @click="togglePlayerSelection(player.id)"
                >
                  {{ player.name }}
                </button>
              </div>
            </div>
            <div class="team-builder-panel">
              <div class="subtitle compact">Teams</div>
              <div class="team-builder-list">
                <div v-if="teamPreview.length === 0" class="subtitle compact">
                  No teams yet.
                </div>
                <div v-for="(team, idx) in teamPreview" :key="team.id" class="team-card">
                  <div class="team-name">
                    {{ team.name }}
                    <span v-if="team.source === 'auto'" class="team-pill">Auto</span>
                  </div>
                  <button
                    v-if="team.source === 'manual'"
                    class="icon-button danger"
                    @click="removeTeam(idx)"
                    aria-label="Remove team"
                  >
                    <svg viewBox="0 0 24 24" role="img">
                      <path
                        d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm3-3h6l1 2H8l1-2z"
                      ></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="team-builder-actions">
            <button
              class="button button-compact"
              @click="createManualTeam"
              :disabled="selectedTeamPlayers.length !== 2"
            >
              Create Team
            </button>
            <div class="subtitle compact">
              Selected {{ selectedTeamPlayers.length }}/2
            </div>
          </div>
        </div>
        <div v-if="session" class="tournament-actions">
          <button class="button ghost button-compact" @click="load">Refresh</button>
          <button class="button button-compact" @click="printBracket">Print</button>
          <button class="button ghost button-compact" @click="exportBracket">Export JSON</button>
        </div>
        <div v-if="error" class="notice">{{ error }}</div>
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
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { TournamentBracket } from "vue3-tournament";
import "vue3-tournament/style.css";
import { api } from "../api.js";

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
const selectedTeamPlayers = ref([]);
let refreshTimer = null;
const manualOverrides = ref({});
const overrideError = ref("");
const bracketRef = ref(null);
const isFullscreen = ref(false);
const showMatchEditor = ref(false);
const editMatchId = ref("");
const editTeamA = ref(null);
const editTeamB = ref(null);
const editScoreA = ref("");
const editScoreB = ref("");
const editWinnerId = ref(null);

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

const entrants = computed(() => {
  if (matchFormat.value === "doubles") {
    return buildTeamEntrants(joinedPlayers.value, manualTeams.value);
  }
  return joinedPlayers.value;
});

const teamPreview = computed(() => (matchFormat.value === "doubles" ? entrants.value : []));

const entrantKeys = computed(() => {
  const keys = entrants.value
    .map((entrant) => (typeof entrant === "string" ? entrant : entrant?.id))
    .filter(Boolean);
  return new Set(keys);
});

const assignedPlayerIds = computed(() => {
  const ids = manualTeams.value.flatMap((team) => team.memberIds || []);
  return new Set(ids);
});

const matchResults = computed(() => buildMatchResults(matches.value));

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
    const activeSession = await api.activeSession();
    session.value = activeSession;
    if (!activeSession) {
      sessionPlayers.value = [];
      matches.value = [];
      manualOverrides.value = {};
      return;
    }
    sessionPlayers.value = await api.sessionPlayers(activeSession.id);
    matches.value = await api.matchHistory(activeSession.id);
    await loadOverrides();
  } catch (err) {
    error.value = err.message || "Unable to load session";
    session.value = null;
    sessionPlayers.value = [];
    matches.value = [];
    manualOverrides.value = {};
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

function buildDoublesTeams(players) {
  return buildTeamEntrants(players, []);
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
      bracketType: bracketType.value,
      matchFormat: matchFormat.value
    });
    const map = {};
    (overrides || []).forEach((override) => {
      map[override.matchId] = {
        winnerId: override.winnerId ?? null,
        score: override.scoreJson ?? null
      };
    });
    manualOverrides.value = map;
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

function togglePlayerSelection(playerId) {
  if (assignedPlayerIds.value.has(playerId)) return;
  if (selectedTeamPlayers.value.includes(playerId)) {
    selectedTeamPlayers.value = selectedTeamPlayers.value.filter((id) => id !== playerId);
    return;
  }
  if (selectedTeamPlayers.value.length >= 2) return;
  selectedTeamPlayers.value = [...selectedTeamPlayers.value, playerId];
}

function createManualTeam() {
  if (selectedTeamPlayers.value.length !== 2) return;
  const selected = selectedTeamPlayers.value
    .map((id) => joinedPlayers.value.find((player) => player.id === id))
    .filter(Boolean);
  if (selected.length !== 2) return;
  const memberIds = selected.map((player) => player.id);
  const name = `${selected[0].name} + ${selected[1].name}`;
  manualTeams.value = [
    ...manualTeams.value,
    buildTeam(memberIds, name, { source: "manual" })
  ];
  selectedTeamPlayers.value = [];
}

function removeTeam(index) {
  const manualOnly = manualTeams.value;
  const teamToRemove = teamPreview.value[index];
  if (!teamToRemove || teamToRemove.source !== "manual") return;
  manualTeams.value = manualOnly.filter((team) => team.id !== teamToRemove.id);
}

function clearTeams() {
  manualTeams.value = [];
  selectedTeamPlayers.value = [];
}

function autoPairTeams() {
  manualTeams.value = buildDoublesTeams(joinedPlayers.value).map((team) => ({
    ...team,
    source: "manual"
  }));
  selectedTeamPlayers.value = [];
}

watch(joinedPlayers, (players) => {
  const valid = new Set(players.map((player) => player.id));
  manualTeams.value = manualTeams.value.filter((team) =>
    (team.memberIds || []).every((id) => valid.has(id))
  );
  selectedTeamPlayers.value = selectedTeamPlayers.value.filter((id) => valid.has(id));
});

watch([bracketType, matchFormat], () => {
  if (session.value) {
    loadOverrides();
  }
  if (matchFormat.value !== "doubles") {
    manualTeams.value = [];
    selectedTeamPlayers.value = [];
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
});
</script>
