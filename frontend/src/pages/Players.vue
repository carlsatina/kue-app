<template>
  <div class="stack">
    <div class="segmented">
      <button class="segment" :class="{ active: activeTab === 'players' }" type="button" @click="activeTab = 'players'">
        Players
      </button>
      <button class="segment" :class="{ active: activeTab === 'queue' }" type="button" @click="activeTab = 'queue'">
        Queue
        <span v-if="queueMatchCount > 0" class="segment-badge">{{ queueMatchCount }}</span>
      </button>
      <button class="segment" :class="{ active: activeTab === 'history' }" type="button" @click="activeTab = 'history'">
        Match History
      </button>
    </div>

    <div v-if="activeTab === 'players'" class="card stack">
      <div class="section-title">Player Name &amp; Skill Level</div>
      <input class="input" v-model="fullName" placeholder="Enter player name" />
      <div class="chip-row">
        <button
          v-for="level in skillLevels"
          :key="level"
          class="chip"
          :class="{ active: skillLevel === level }"
          type="button"
          @click="skillLevel = level"
        >
          {{ level }}
        </button>
      </div>
      <button class="button" @click="addPlayer">Add Player</button>
      <div v-if="addError" class="notice">{{ addError }}</div>
    </div>

    <div v-if="activeTab === 'players'" class="card stack">
      <div class="grid two">
        <div class="stack">
          <div class="subtitle">Search Players</div>
          <input class="input" v-model="search" placeholder="Search players" />
          <div class="subtitle">{{ filteredPlayers.length }} Players Available</div>
        </div>
        <div class="stack">
          <div class="subtitle">Filter Players</div>
          <select class="input" v-model="filterSkill">
            <option value="">None</option>
            <option v-for="level in skillLevels" :key="level" :value="level">{{ level }}</option>
          </select>
        </div>
      </div>

      <div class="game-type">
        <div class="subtitle">Game type</div>
        <label class="radio-row">
          <input type="radio" value="doubles" v-model="gameType" />
          Doubles
        </label>
        <label class="radio-row">
          <input type="radio" value="singles" v-model="gameType" />
          Singles
        </label>
      </div>

      <div class="subtitle">Pick {{ selectionLimit }} Players to Start</div>
      <div class="player-grid">
        <div
          v-for="player in filteredPlayers"
          :key="player.id"
          class="player-card"
          :class="{
            selected: selectedIds.includes(player.id),
            disabled: isPlaying(player)
          }"
          @click="toggleSelect(player)"
        >
          <div class="player-card-top">
            <div class="player-name">
              <strong>{{ player.nickname || player.fullName }}</strong>
              <button class="icon-button small" @click.stop="openEditPlayer(player)" aria-label="Edit player">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M4 15.5V20h4.5L19 9.5 14.5 5 4 15.5z"></path>
                </svg>
              </button>
            </div>
            <span class="status-pill" :class="statusClass(player)">{{ statusLabel(player) }}</span>
          </div>
          <div class="subtitle">Games: {{ gamesPlayed(player.id) }}</div>
        </div>
      </div>

      <div class="inline-actions">
        <button class="button" :disabled="!canAdd" @click="addToQueue">Add to Queue</button>
        <button class="button ghost" :disabled="selectedIds.length === 0" @click="clearSelection">Clear</button>
      </div>
      <div v-if="queueError" class="notice">{{ queueError }}</div>
    </div>

    <div v-if="activeTab === 'queue'" class="card stack">
      <div class="queue-header">
        <div>
          <div class="section-title">Queue</div>
          <div class="subtitle">{{ queueMatches.length }} match waiting</div>
        </div>
        <button class="link-button" @click="createQueueShareLink">
          <span class="link-icon">🔗</span>
          Create Share Link
        </button>
      </div>

      <div class="share-card">
        <div class="share-text">Share your queue with players so they can view upcoming matches.</div>
        <div v-if="queueShareLink" class="share-link">
          <input class="input" readonly :value="queueShareLink" />
          <button class="button ghost button-compact" @click="copyQueueShareLink">Copy</button>
        </div>
      </div>

      <div v-if="queueMatches.length === 0" class="subtitle">Queue is empty.</div>
      <div v-for="(match, idx) in queueMatches" :key="match.id" class="queue-match-card">
        <div class="queue-card-head">
          <strong>#{{ idx + 1 }} {{ match.typeLabel }}</strong>
          <span class="subtitle">Requested {{ formatTime(match.requestedAt) }}</span>
        </div>
        <div class="queue-vs">
          <div class="queue-team">{{ match.teamA.join(" + ") }}</div>
          <span class="queue-vs-pill">vs</span>
          <div class="queue-team">{{ match.teamB.join(" + ") }}</div>
        </div>
        <div class="queue-courts">
          <div class="subtitle">Let's Play - Assign a Court:</div>
          <div class="court-buttons">
            <button
              v-for="court in availableCourts"
              :key="court.id"
              class="button ghost button-compact"
              @click="assignMatch(match, court)"
            >
              {{ court.court?.name || court.name }}
            </button>
          </div>
        </div>
        <button class="link-button danger" @click="cancelQueuedMatch(match)">Cancel match</button>
      </div>
    </div>

    <div v-if="activeTab === 'history'" class="card stack">
      <div class="section-title">Match History</div>
      <input class="input" v-model="historySearch" placeholder="Search by player name..." />
      <div v-if="filteredHistory.length === 0" class="subtitle">No matches yet.</div>
      <div v-for="match in filteredHistory" :key="match.id" class="history-card sleek">
        <div class="history-head">
          <div class="history-left">
            <span class="history-index">#{{ historyOrder(match) }}</span>
            <span class="history-pill">{{ match.matchType === 'doubles' ? 'Doubles' : 'Singles' }}</span>
            <span class="history-pill tie" v-if="match.winnerTeam == null && match.status === 'ended'">Tie</span>
            <span class="history-pill cancelled" v-if="match.status === 'cancelled'">Cancelled</span>
          </div>
          <div class="history-time">{{ formatTime(match.endedAt || match.startedAt) }}</div>
        </div>
        <div class="history-vs">
          <div class="history-team" :class="{ winner: match.winnerTeam === 1 }">
            {{ teamNames(match, 1) }} <span v-if="match.winnerTeam === 1">🏆</span>
          </div>
          <span class="history-vs-pill">vs</span>
          <div class="history-team" :class="{ winner: match.winnerTeam === 2 }">
            {{ teamNames(match, 2) }} <span v-if="match.winnerTeam === 2">🏆</span>
          </div>
        </div>
        <div class="history-meta">
          <div class="history-meta-card">
            <div class="subtitle">Duration</div>
            <strong>{{ durationLabel(match.startedAt, match.endedAt) }}</strong>
          </div>
          <div class="history-meta-card">
            <div class="subtitle">Court</div>
            <strong>{{ match.courtSession?.court?.name || '—' }}</strong>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showEditPlayer" class="modal-backdrop">
      <div class="modal-card">
        <h3>Edit Player</h3>
        <input class="input" v-model="editPlayerName" placeholder="Player name" />
        <div class="chip-row">
          <button
            v-for="level in skillLevels"
            :key="level"
            class="chip"
            :class="{ active: editSkillLevel === level }"
            type="button"
            @click="editSkillLevel = level"
          >
            {{ level }}
          </button>
        </div>
        <div v-if="editError" class="notice">{{ editError }}</div>
        <div class="grid two">
          <button class="button" @click="saveEditPlayer">Save</button>
          <button class="button ghost" @click="closeEditPlayer">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { api } from "../api.js";

const activeTab = ref("players");
const players = ref([]);
const session = ref(null);
const sessionPlayers = ref([]);
const queueEntries = ref([]);
const matches = ref([]);
const fullName = ref("");
const skillLevel = ref("Beginner");
const addError = ref("");
const search = ref("");
const filterSkill = ref("");
const gameType = ref("doubles");
const selectedIds = ref([]);
const queueError = ref("");
const queueShareLink = ref("");
const historySearch = ref("");
const showEditPlayer = ref(false);
const editPlayerId = ref("");
const editPlayerName = ref("");
const editSkillLevel = ref("Beginner");
const editError = ref("");
const nowTick = ref(Date.now());
let timerId = null;

const skillLevels = ["Beginner", "Intermediate", "Upper Intermediate"];

const selectionLimit = computed(() => 4);

const sessionPlayerMap = computed(() => {
  const map = new Map();
  sessionPlayers.value.forEach((sp) => map.set(sp.playerId, sp));
  return map;
});

const playingIds = computed(() => {
  const ids = new Set();
  if (!session.value?.courtSessions) return ids;
  session.value.courtSessions.forEach((cs) => {
    cs.currentMatch?.participants?.forEach((p) => ids.add(p.playerId));
  });
  return ids;
});

const queuedIds = computed(() => {
  const ids = new Set();
  queueEntries.value.forEach((entry) => {
    entry.players.forEach((p) => ids.add(p.playerId));
  });
  return ids;
});

const filteredPlayers = computed(() => {
  const q = search.value.trim().toLowerCase();
  return players.value.filter((p) => {
    const name = `${p.fullName} ${p.nickname || ""}`.toLowerCase();
    const matchesSearch = !q || name.includes(q);
    const matchesSkill = !filterSkill.value || p.skillLevel === filterSkill.value;
    return matchesSearch && matchesSkill;
  });
});

const canAdd = computed(() => selectedIds.value.length === selectionLimit.value && session.value);

const queueMatchCount = computed(() => queueMatches.value.length);

const queueMatches = computed(() => {
  const entries = queueEntries.value.slice();
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
      requestedAt: a.createdAt,
      entryIds: [a.id, b.id],
      matchType: a.type,
      teamIds: [
        a.players.map((p) => p.playerId),
        b.players.map((p) => p.playerId)
      ]
    });
  }
  return matches;
});

const availableCourts = computed(() => {
  return (session.value?.courtSessions || []).filter((c) => c.status === "available");
});

function isPlaying(player) {
  return playingIds.value.has(player.id);
}

function isQueued(player) {
  return queuedIds.value.has(player.id);
}

function gamesPlayed(playerId) {
  return sessionPlayerMap.value.get(playerId)?.gamesPlayed || 0;
}

function statusLabel(player) {
  if (isPlaying(player)) return "Playing";
  if (isQueued(player)) return "Queued";
  const sp = sessionPlayerMap.value.get(player.id);
  if (!sp) return "—";
  if (sp.status === "away") return "Away";
  if (sp.status === "done") return "Done";
  if (sp.status === "checked_in") {
    const elapsed = idleElapsed(sp);
    return `Idle ${elapsed}`;
  }
  return "—";
}

function statusClass(player) {
  if (isPlaying(player)) return "playing";
  if (isQueued(player)) return "queued";
  const sp = sessionPlayerMap.value.get(player.id);
  if (!sp) return "neutral";
  if (sp.status === "away") return "away";
  if (sp.status === "done") return "done";
  if (sp.status === "checked_in") return "idle";
  return "neutral";
}

function idleElapsed(sp) {
  const start = sp.lastPlayedAt || sp.checkedInAt;
  if (!start) return "0:00";
  const diffMs = Math.max(0, nowTick.value - new Date(start).getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function toggleSelect(player) {
  if (isPlaying(player)) return;
  if (selectedIds.value.includes(player.id)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== player.id);
    return;
  }
  if (selectedIds.value.length >= selectionLimit.value) return;
  selectedIds.value = [...selectedIds.value, player.id];
}

function clearSelection() {
  selectedIds.value = [];
}

async function load() {
  players.value = await api.listPlayers();
  try {
    session.value = await api.activeSession();
    queueEntries.value = await api.getQueue(session.value.id);
    sessionPlayers.value = await api.sessionPlayers(session.value.id);
    matches.value = await api.matchHistory(session.value.id);
  } catch {
    session.value = null;
    queueEntries.value = [];
    sessionPlayers.value = [];
    matches.value = [];
  }
}

async function addPlayer() {
  addError.value = "";
  if (!fullName.value.trim()) {
    addError.value = "Player name is required.";
    return;
  }
  await api.createPlayer({ fullName: fullName.value.trim(), skillLevel: skillLevel.value });
  fullName.value = "";
  await load();
}

async function ensureCheckedIn(playerIds) {
  if (!session.value) return;
  for (const playerId of playerIds) {
    const sp = sessionPlayerMap.value.get(playerId);
    if (!sp || sp.status !== "checked_in") {
      await api.checkinPlayer(playerId, { sessionId: session.value.id });
    }
  }
}

async function addToQueue() {
  if (!session.value) return;
  queueError.value = "";
  if (selectedIds.value.length !== selectionLimit.value) {
    queueError.value = `Select ${selectionLimit.value} players.`;
    return;
  }

  try {
    await ensureCheckedIn(selectedIds.value);
    if (gameType.value === "doubles") {
      const teamA = selectedIds.value.slice(0, 2);
      const teamB = selectedIds.value.slice(2, 4);
      await api.enqueue(session.value.id, { type: "doubles", playerIds: teamA });
      await api.enqueue(session.value.id, { type: "doubles", playerIds: teamB });
    } else {
      for (const playerId of selectedIds.value) {
        await api.enqueue(session.value.id, { type: "singles", playerIds: [playerId] });
      }
    }
    selectedIds.value = [];
    await load();
  } catch (err) {
    queueError.value = err.message || "Unable to add to queue";
  }
}

async function removeEntry(entryId) {
  if (!session.value) return;
  await api.dequeue(session.value.id, { entryId });
  await load();
}

async function assignMatch(match, court) {
  if (!session.value) return;
  await api.startMatch(session.value.id, {
    courtSessionId: court.id,
    matchType: match.matchType,
    teams: match.teamIds,
    entryIds: match.entryIds
  });
  await load();
}

async function cancelQueuedMatch(match) {
  if (!session.value) return;
  for (const entryId of match.entryIds) {
    await api.dequeue(session.value.id, { entryId });
  }
  await load();
}

async function createQueueShareLink() {
  if (!session.value) return;
  const link = await api.createSessionShareLink(session.value.id);
  queueShareLink.value = `${window.location.origin}/q/${link.token}`;
}

async function copyQueueShareLink() {
  if (!queueShareLink.value) return;
  await navigator.clipboard.writeText(queueShareLink.value);
}

function matchTeams(match) {
  const team1 = match.participants.filter((p) => p.teamNumber === 1).map((p) => p.player.nickname || p.player.fullName);
  const team2 = match.participants.filter((p) => p.teamNumber === 2).map((p) => p.player.nickname || p.player.fullName);
  return `${team1.join(" + ")} vs ${team2.join(" + ")}`;
}

function teamNames(match, teamNumber) {
  if (!match) return "—";
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

const historyOrderMap = computed(() => {
  const sorted = [...matches.value].sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return aTime - bTime;
  });
  const map = new Map();
  sorted.forEach((match, idx) => map.set(match.id, idx + 1));
  return map;
});

const filteredHistory = computed(() => {
  const q = historySearch.value.trim().toLowerCase();
  const source = [...matches.value].sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return aTime - bTime;
  });
  if (!q) return source;
  return source.filter((match) =>
    match.participants.some((p) => {
      const name = `${p.player.fullName} ${p.player.nickname || ""}`.toLowerCase();
      return name.includes(q);
    })
  );
});

function durationLabel(startedAt, endedAt) {
  if (!startedAt || !endedAt) return "—";
  const diffMs = Math.max(0, new Date(endedAt) - new Date(startedAt));
  const minutes = Math.max(1, Math.round(diffMs / 60000));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function historyOrder(match) {
  return historyOrderMap.value.get(match.id) || "—";
}

function openEditPlayer(player) {
  editPlayerId.value = player.id;
  editPlayerName.value = player.fullName;
  editSkillLevel.value = player.skillLevel || "Beginner";
  editError.value = "";
  showEditPlayer.value = true;
}

async function saveEditPlayer() {
  if (!editPlayerId.value) return;
  if (!editPlayerName.value.trim()) {
    editError.value = "Player name is required.";
    return;
  }
  try {
    await api.updatePlayer(editPlayerId.value, {
      fullName: editPlayerName.value.trim(),
      skillLevel: editSkillLevel.value
    });
    closeEditPlayer();
    await load();
  } catch (err) {
    editError.value = err.message || "Unable to update player";
  }
}

function closeEditPlayer() {
  showEditPlayer.value = false;
  editPlayerId.value = "";
  editPlayerName.value = "";
  editSkillLevel.value = "Beginner";
  editError.value = "";
}

watch(gameType, () => {
  selectedIds.value = [];
});

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
