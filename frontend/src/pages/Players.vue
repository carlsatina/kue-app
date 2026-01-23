<template>
  <div class="page-grid" :class="{ 'with-sidebar': activeTab === 'players' }">
    <div class="segmented page-full">
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

    <template v-if="activeTab === 'players'">
      <div class="page-main stack">
        <div class="card stack live-surface">
          <div v-if="!session" class="subtitle">No active session. Open a session to view and queue players.</div>
          <template v-else>
            <div class="stack">
              <div class="subtitle">Search Players</div>
              <div class="players-toolbar">
                <input class="input" v-model="search" placeholder="Search players" />
                <div class="menu" ref="displayMenuRef">
                  <button class="menu-button" type="button" @click="showDisplayMenu = !showDisplayMenu">
                    <svg viewBox="0 0 24 24" role="img">
                      <path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h7v2H4v-2z"></path>
                    </svg>
                  </button>
                  <div v-if="showDisplayMenu" class="menu-panel">
                    <label class="radio-row">
                      <input type="checkbox" v-model="showJoinOrder" />
                      Show join order
                    </label>
                  </div>
                </div>
              </div>
              <div class="subtitle">{{ filteredPlayers.length }} Players Available</div>
            </div>

            <div class="game-type">
              <div class="subtitle">Game type</div>
              <div class="subtitle compact">{{ sessionGameTypeLabel }}</div>
            </div>

            <div class="subtitle">Pick {{ selectionLimit }} Players to Start</div>
            <div class="player-grid">
              <div
                v-for="player in filteredPlayers"
                :key="player.id"
                class="player-card"
                :class="{
                  selected: selectedIds.includes(player.id),
                  disabled: isPlaying(player),
                  'new-player': isNewPlayer(player),
                  'over-limit': isOverJoinLimit(player.id)
                }"
                @click="toggleSelect(player)"
              >
                <div class="player-card-top">
                  <div class="player-name">
                    <div class="player-name-row">
                      <strong class="player-name-text">{{ player.nickname || player.fullName }}</strong>
                      <button class="icon-button small" @click.stop="openEditPlayer(player)" aria-label="Edit player">
                        <svg viewBox="0 0 24 24" role="img">
                          <path d="M4 15.5V20h4.5L19 9.5 14.5 5 4 15.5z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span class="status-pill" :class="statusClass(player)">{{ statusLabel(player) }}</span>
                </div>
                <div class="subtitle games-text">Games: {{ gamesPlayed(player.id) }}</div>
                <div v-if="showJoinOrder" class="subtitle join-order-line">
                  Join order: {{ joinOrderLabel(player.id) }}
                </div>
              </div>
            </div>

            <div class="inline-actions">
              <button class="button button-compact" :disabled="!canAdd" @click="addToQueue">Add to Queue</button>
              <button
                v-if="showMarkPresent"
                class="button secondary button-compact"
                :disabled="selectedIds.length === 0"
                @click="markPresent"
              >
                Mark Present
              </button>
              <button class="button ghost danger button-compact" :disabled="selectedIds.length === 0" @click="openRemoveConfirm">
                Remove
              </button>
            </div>
            <div v-if="queueError" class="notice">{{ queueError }}</div>
            <div v-if="removeError" class="notice">{{ removeError }}</div>
            <div v-if="presentError" class="notice">{{ presentError }}</div>
          </template>
        </div>
      </div>

      <div class="page-side stack">
        <div class="card stack live-surface" :class="{ 'over-limit': joinLimitExceeded }">
          <div class="section-title">Player Name &amp; Skill Level</div>
          <input class="input" v-model="fullName" placeholder="Enter player name" :disabled="!session" />
          <div class="chip-row">
            <button
              v-for="level in skillLevels"
              :key="level"
              class="chip"
              :class="{ active: skillLevel === level }"
              type="button"
              :disabled="!session"
              @click="skillLevel = level"
            >
              {{ level }}
            </button>
          </div>
          <button class="button" @click="addPlayer" :disabled="!session">Add Player</button>
          <div v-if="addError" class="notice">{{ addError }}</div>
        </div>
      </div>
    </template>

    <div v-if="activeTab === 'queue'" class="card stack live-surface page-full">
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
        <button class="button ghost button-compact" :class="{ active: queueCopied }" @click="copyQueueShareLink">
          {{ queueCopied ? "Copied" : "Copy" }}
        </button>
      </div>
      </div>

      <div v-if="queueMatches.length === 0" class="subtitle">Queue is empty.</div>
      <div v-for="(match, idx) in queueMatches" :key="match.id" class="queue-match-card" :class="{ alt: idx % 2 === 1 }">
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

    <div v-if="activeTab === 'history'" class="card stack page-full">
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
    <div v-if="showDuplicateWarning" class="modal-backdrop">
      <div class="modal-card">
        <h3>Players already queued or playing</h3>
        <div class="subtitle">
          {{ duplicateWarningText }}
        </div>
        <div class="grid two">
          <button class="button" @click="confirmDuplicateWarning">Add Anyway</button>
          <button class="button ghost" @click="closeDuplicateWarning">Cancel</button>
        </div>
      </div>
    </div>
    <div v-if="showCancelConfirm" class="modal-backdrop">
      <div class="modal-card">
        <h3>Cancel match</h3>
        <div class="subtitle">Are you sure you want to cancel this match?</div>
        <div class="grid two">
          <button class="button danger" @click="confirmCancelMatch">Cancel match</button>
          <button class="button ghost" @click="closeCancelConfirm">Keep</button>
        </div>
      </div>
    </div>
    <div v-if="showRemoveConfirm" class="modal-backdrop">
      <div class="modal-card">
        <h3>Remove players</h3>
        <div class="subtitle">{{ removeConfirmText }}</div>
        <div class="grid two">
          <button class="button danger" @click="confirmRemoveSelected">Remove</button>
          <button class="button ghost" @click="closeRemoveConfirm">Cancel</button>
        </div>
      </div>
    </div>
    <div v-if="showPairingModal" class="modal-backdrop">
      <div class="modal-card pairing-modal">
        <div class="section-title">Pair teams</div>
        <div class="subtitle">Drag players or tap two slots to swap.</div>
        <div class="pairing-grid">
          <div class="pairing-team">
            <div class="subtitle">Team A</div>
            <div
              v-for="slotIndex in [0, 1]"
              :key="`a-${slotIndex}`"
              class="pairing-slot"
              :data-index="slotIndex"
              :class="{
                selected: pairingSelectedIndex === slotIndex,
                hover: pairingHoverIndex === slotIndex
              }"
              @click="selectPairSlot(slotIndex)"
            >
              <div
                v-if="pairingOrder[slotIndex]"
                class="pairing-pill"
                :class="{ dragging: draggingPairIndex === slotIndex }"
                @pointerdown.prevent="onPairPointerDown(slotIndex, $event)"
              >
                {{ playerNameById(pairingOrder[slotIndex]) }}
              </div>
              <div v-else class="subtitle compact">Drop player</div>
            </div>
          </div>
          <div class="pairing-team">
            <div class="subtitle">Team B</div>
            <div
              v-for="slotIndex in [2, 3]"
              :key="`b-${slotIndex}`"
              class="pairing-slot"
              :data-index="slotIndex"
              :class="{
                selected: pairingSelectedIndex === slotIndex,
                hover: pairingHoverIndex === slotIndex
              }"
              @click="selectPairSlot(slotIndex)"
            >
              <div
                v-if="pairingOrder[slotIndex]"
                class="pairing-pill"
                :class="{ dragging: draggingPairIndex === slotIndex }"
                @pointerdown.prevent="onPairPointerDown(slotIndex, $event)"
              >
                {{ playerNameById(pairingOrder[slotIndex]) }}
              </div>
              <div v-else class="subtitle compact">Drop player</div>
            </div>
          </div>
        </div>
        <div class="pairing-actions">
          <button class="button ghost" @click="closePairingModal">Cancel</button>
          <button class="button" @click="confirmPairingAdd">Add to Queue</button>
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
const selectedIds = ref([]);
const queueError = ref("");
const removeError = ref("");
const presentError = ref("");
const queueShareLink = ref("");
const queueCopied = ref(false);
let queueCopyTimer = null;
const historySearch = ref("");
const showDisplayMenu = ref(false);
const showJoinOrder = ref(true);
const displayMenuRef = ref(null);
const showEditPlayer = ref(false);
const editPlayerId = ref("");
const editPlayerName = ref("");
const editSkillLevel = ref("Beginner");
const editError = ref("");
const showDuplicateWarning = ref(false);
const duplicateWarningNames = ref([]);
const pendingQueueOrder = ref(null);
const showRemoveConfirm = ref(false);
const removeConfirmNames = ref([]);
const showCancelConfirm = ref(false);
const cancelMatchTarget = ref(null);
const nowTick = ref(Date.now());
let timerId = null;
const showPairingModal = ref(false);
const pairingOrder = ref([]);
const draggingPairIndex = ref(null);
const pairingHoverIndex = ref(null);
const lastPairingSignature = ref("");
const pairingSelectedIndex = ref(null);
let pairingDragState = null;
let pairingDragEndedAt = 0;

const skillLevels = ["Beginner", "Intermediate", "Upper Intermediate"];

const sessionGameType = computed(() => session.value?.gameType || "doubles");
const sessionGameTypeLabel = computed(() =>
  sessionGameType.value === "singles" ? "Singles" : "Doubles"
);
const selectionLimit = computed(() => (sessionGameType.value === "singles" ? 2 : 4));

const sessionPlayerMap = computed(() => {
  const map = new Map();
  sessionPlayers.value.forEach((sp) => map.set(sp.playerId, sp));
  return map;
});

const playerMap = computed(() => {
  const map = new Map();
  players.value.forEach((player) => map.set(player.id, player));
  return map;
});

const overallJoinOrderMap = computed(() => {
  const sorted = sessionPlayers.value
    .filter((sp) => sp.status !== "done")
    .sort((a, b) => {
      const aTime = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const bTime = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return aTime - bTime;
    });
  const map = new Map();
  sorted.forEach((sp, idx) => map.set(sp.playerId, idx + 1));
  return map;
});

const regularJoinOrderMap = computed(() => {
  const sorted = sessionPlayers.value
    .filter((sp) => sp.status !== "done" && !sp.isNewPlayer)
    .sort((a, b) => {
      const aTime = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const bTime = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return aTime - bTime;
    });
  const map = new Map();
  sorted.forEach((sp, idx) => map.set(sp.playerId, idx + 1));
  return map;
});

const newJoinerOrderMap = computed(() => {
  const sorted = sessionPlayers.value
    .filter((sp) => sp.status !== "done" && sp.isNewPlayer)
    .sort((a, b) => {
      const aTime = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const bTime = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return aTime - bTime;
    });
  const map = new Map();
  sorted.forEach((sp, idx) => map.set(sp.playerId, idx + 1));
  return map;
});

const regularLimit = computed(() => Number(session.value?.regularJoinLimit || 0));
const newJoinerLimit = computed(() => Number(session.value?.newJoinerLimit || 0));
const regularJoinedCount = computed(
  () => sessionPlayers.value.filter((sp) => sp.status !== "done" && !sp.isNewPlayer).length
);
const newJoinedCount = computed(
  () => sessionPlayers.value.filter((sp) => sp.status !== "done" && sp.isNewPlayer).length
);
const joinLimitExceeded = computed(() => {
  const regularExceeded = regularLimit.value > 0 && regularJoinedCount.value > regularLimit.value;
  const newExceeded = newJoinerLimit.value > 0 && newJoinedCount.value > newJoinerLimit.value;
  return regularExceeded || newExceeded;
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

const sessionPlayerList = computed(() => {
  if (!session.value) return [];
  return sessionPlayers.value.filter((sp) => sp.status !== "done").map((sp) => sp.player);
});

const filteredPlayers = computed(() => {
  const q = search.value.trim().toLowerCase();
  return sessionPlayerList.value.filter((p) => {
    const name = `${p.fullName} ${p.nickname || ""}`.toLowerCase();
    const matchesSearch = !q || name.includes(q);
    return matchesSearch;
  });
});

const canAdd = computed(() => selectedIds.value.length === selectionLimit.value && session.value);

const queueMatchCount = computed(() => queueMatches.value.length);

const showMarkPresent = computed(() =>
  selectedIds.value.some((playerId) => sessionPlayerMap.value.get(playerId)?.status === "checked_in")
);
const duplicateWarningText = computed(() => {
  if (!duplicateWarningNames.value.length) {
    return "Selected players are already queued or playing. Add to queue again?";
  }
  return `These players are already queued or playing: ${duplicateWarningNames.value.join(", ")}. Add to queue again?`;
});

const removeConfirmText = computed(() => {
  if (!removeConfirmNames.value.length) return "Remove the selected players from this session?";
  return `Remove ${removeConfirmNames.value.join(", ")} from this session?`;
});

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
  return (session.value?.courtSessions || [])
    .filter((c) => c.status === "available")
    .slice()
    .sort((a, b) => {
      const aName = a.court?.name || a.name || "";
      const bName = b.court?.name || b.name || "";
      const aNum = Number(aName.match(/\d+/)?.[0] || Number.POSITIVE_INFINITY);
      const bNum = Number(bName.match(/\d+/)?.[0] || Number.POSITIVE_INFINITY);
      if (aNum !== bNum) return aNum - bNum;
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: "base" });
    });
});

function isPlaying(player) {
  return playingIds.value.has(player.id);
}

function isQueued(player) {
  return queuedIds.value.has(player.id);
}

function isNewPlayer(player) {
  return sessionPlayerMap.value.get(player.id)?.isNewPlayer || false;
}

function gamesPlayed(playerId) {
  return sessionPlayerMap.value.get(playerId)?.gamesPlayed || 0;
}

function joinOrderLabel(playerId) {
  if (sessionPlayerMap.value.get(playerId)?.isNewPlayer) {
    const order = newJoinerOrderMap.value.get(playerId);
    return order ? `n${order}` : "—";
  }
  const order = regularJoinOrderMap.value.get(playerId);
  return order ? `r${order}` : "—";
}

function isOverJoinLimit(playerId) {
  const sp = sessionPlayerMap.value.get(playerId);
  if (!sp) return false;
  if (sp.isNewPlayer) {
    const limit = newJoinerLimit.value;
    if (!limit) return false;
    const order = newJoinerOrderMap.value.get(playerId);
    return order ? order > limit : false;
  }
  const limit = regularLimit.value;
  if (!limit) return false;
  const order = regularJoinOrderMap.value.get(playerId);
  return order ? order > limit : false;
}

function statusLabel(player) {
  if (isPlaying(player)) return "Playing";
  if (isQueued(player)) return "Queued";
  const sp = sessionPlayerMap.value.get(player.id);
  if (!sp) return "—";
  if (sp.status === "away") return "Away";
  if (sp.status === "done") return "Done";
  if (sp.status === "present") return "Present";
  if (sp.status === "checked_in") {
    if (sp.lastPlayedAt) {
      const elapsed = idleElapsed(sp);
      return `Idle ${elapsed}`;
    }
    return "Ready";
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
  if (sp.status === "present") return "present";
  if (sp.status === "checked_in") {
    return sp.lastPlayedAt ? "idle" : "checkedin";
  }
  return "neutral";
}

function idleElapsed(sp) {
  const start = sp.lastPlayedAt;
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
    const activeSession = await api.activeSession();
    session.value = activeSession;
    if (!activeSession) {
      queueEntries.value = [];
      sessionPlayers.value = [];
      matches.value = [];
      return;
    }
    queueEntries.value = await api.getQueue(activeSession.id);
    sessionPlayers.value = await api.sessionPlayers(activeSession.id);
    matches.value = await api.matchHistory(activeSession.id);
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
  try {
    const created = await api.createPlayer({ fullName: fullName.value.trim(), skillLevel: skillLevel.value });
    if (session.value?.id) {
      await api.checkinPlayer(created.id, { sessionId: session.value.id });
    }
    fullName.value = "";
    await load();
  } catch (err) {
    addError.value = err.message || "Unable to add player";
  }
}

async function ensureCheckedIn(playerIds) {
  if (!session.value) return;
  for (const playerId of playerIds) {
    const sp = sessionPlayerMap.value.get(playerId);
    if (!sp || (sp.status !== "checked_in" && sp.status !== "present")) {
      await api.checkinPlayer(playerId, { sessionId: session.value.id });
    }
  }
}

async function addToQueue() {
  if (!session.value) return;
  queueError.value = "";
  removeError.value = "";
  presentError.value = "";
  if (selectedIds.value.length !== selectionLimit.value) {
    queueError.value = `Select ${selectionLimit.value} players.`;
    return;
  }

  try {
    if (sessionGameType.value === "doubles" && selectedIds.value.length === 4) {
      openPairingModal();
      return;
    }
    await attemptQueue(selectedIds.value);
  } catch (err) {
    queueError.value = err.message || "Unable to add to queue";
  }
}

async function markPresent() {
  if (!session.value || selectedIds.value.length === 0) return;
  presentError.value = "";
  try {
    for (const playerId of selectedIds.value) {
      await api.presentPlayer(playerId, { sessionId: session.value.id });
    }
    await load();
  } catch (err) {
    presentError.value = err.message || "Unable to mark present";
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
  cancelMatchTarget.value = match;
  showCancelConfirm.value = true;
}

async function confirmCancelMatch() {
  if (!session.value || !cancelMatchTarget.value) return;
  for (const entryId of cancelMatchTarget.value.entryIds) {
    await api.dequeue(session.value.id, { entryId });
  }
  cancelMatchTarget.value = null;
  showCancelConfirm.value = false;
  await load();
}

function closeCancelConfirm() {
  showCancelConfirm.value = false;
  cancelMatchTarget.value = null;
}

async function createQueueShareLink() {
  if (!session.value) return;
  const link = await api.createSessionShareLink(session.value.id);
  queueShareLink.value = `${window.location.origin}/q/${link.token}`;
}

async function copyQueueShareLink() {
  if (!queueShareLink.value) return;
  await navigator.clipboard.writeText(queueShareLink.value);
  queueCopied.value = true;
  if (queueCopyTimer) window.clearTimeout(queueCopyTimer);
  queueCopyTimer = window.setTimeout(() => {
    queueCopied.value = false;
  }, 1500);
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

function hasDuplicateSelection(order = selectedIds.value) {
  return order.some((playerId) => queuedIds.value.has(playerId) || playingIds.value.has(playerId));
}

function openDuplicateWarning(order = selectedIds.value) {
  pendingQueueOrder.value = order.slice();
  duplicateWarningNames.value = order
    .filter((playerId) => queuedIds.value.has(playerId) || playingIds.value.has(playerId))
    .map((id) => players.value.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => p.nickname || p.fullName);
  showDuplicateWarning.value = true;
}

function closeDuplicateWarning() {
  showDuplicateWarning.value = false;
  duplicateWarningNames.value = [];
  pendingQueueOrder.value = null;
}

async function confirmDuplicateWarning() {
  showDuplicateWarning.value = false;
  try {
    await enqueueSelectedPlayers(pendingQueueOrder.value || selectedIds.value);
  } catch (err) {
    queueError.value = err.message || "Unable to add to queue";
  } finally {
    duplicateWarningNames.value = [];
    pendingQueueOrder.value = null;
  }
}

async function enqueueSelectedPlayers(order = selectedIds.value) {
  await ensureCheckedIn(order);
  if (sessionGameType.value === "doubles") {
    const teamA = order.slice(0, 2);
    const teamB = order.slice(2, 4);
    await api.enqueue(session.value.id, { type: "doubles", playerIds: teamA });
    await api.enqueue(session.value.id, { type: "doubles", playerIds: teamB });
  } else {
    for (const playerId of order) {
      await api.enqueue(session.value.id, { type: "singles", playerIds: [playerId] });
    }
  }
  selectedIds.value = [];
  await load();
}

function openRemoveConfirm() {
  removeError.value = "";
  queueError.value = "";
  if (!session.value || selectedIds.value.length === 0) return;
  const blockedIds = selectedIds.value.filter(
    (playerId) => queuedIds.value.has(playerId) || playingIds.value.has(playerId)
  );
  if (blockedIds.length) {
    const names = blockedIds
      .map((id) => players.value.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => p.nickname || p.fullName);
    removeError.value = names.length
      ? `Cannot remove queued or playing players: ${names.join(", ")}.`
      : "Cannot remove queued or playing players.";
    return;
  }
  removeConfirmNames.value = selectedIds.value
    .map((id) => players.value.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => p.nickname || p.fullName);
  showRemoveConfirm.value = true;
}

function closeRemoveConfirm() {
  showRemoveConfirm.value = false;
  removeConfirmNames.value = [];
}

function openPairingModal() {
  pairingOrder.value = selectedIds.value.slice();
  draggingPairIndex.value = null;
  pairingHoverIndex.value = null;
  pairingSelectedIndex.value = null;
  showPairingModal.value = true;
}

function closePairingModal() {
  showPairingModal.value = false;
  pairingOrder.value = [];
  draggingPairIndex.value = null;
  pairingHoverIndex.value = null;
  pairingSelectedIndex.value = null;
}

async function confirmPairingAdd() {
  if (!session.value || pairingOrder.value.length !== 4) return;
  showPairingModal.value = false;
  try {
    await attemptQueue(pairingOrder.value);
  } catch (err) {
    queueError.value = err.message || "Unable to add to queue";
  } finally {
    pairingOrder.value = [];
    draggingPairIndex.value = null;
    pairingHoverIndex.value = null;
    pairingSelectedIndex.value = null;
  }
}

function onPairPointerDown(index, event) {
  if (!pairingOrder.value[index]) return;
  event.preventDefault();
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const ghost = target.cloneNode(true);
  ghost.classList.add("pairing-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  document.body.appendChild(ghost);

  pairingDragState = {
    originIndex: index,
    pointerId: event.pointerId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
    ghost,
    element: target
  };
  draggingPairIndex.value = index;
  pairingHoverIndex.value = index;

  try {
    target.setPointerCapture(event.pointerId);
  } catch {
    // ignore capture errors
  }

  updatePairGhostPosition(event.clientX, event.clientY);
  window.addEventListener("pointermove", onPairPointerMove);
  window.addEventListener("pointerup", onPairPointerUp);
  window.addEventListener("pointercancel", onPairPointerUp);
}

function onPairPointerMove(event) {
  if (!pairingDragState || event.pointerId !== pairingDragState.pointerId) return;
  updatePairGhostPosition(event.clientX, event.clientY);
  if (!pairingDragState.moved) {
    const dx = Math.abs(event.clientX - pairingDragState.startX);
    const dy = Math.abs(event.clientY - pairingDragState.startY);
    if (dx > 4 || dy > 4) pairingDragState.moved = true;
  }
  const index = findPairSlotIndex(event.clientX, event.clientY);
  pairingHoverIndex.value = index;
}

function onPairPointerUp(event) {
  if (!pairingDragState || event.pointerId !== pairingDragState.pointerId) return;
  const originIndex = pairingDragState.originIndex;
  const dropIndex = pairingHoverIndex.value;
  cleanupPairDrag(event);
  if (dropIndex == null || dropIndex === originIndex) return;
  const next = pairingOrder.value.slice();
  const temp = next[dropIndex];
  next[dropIndex] = next[originIndex];
  next[originIndex] = temp;
  pairingOrder.value = next;
}

function handleDisplayMenuOutsideClick(event) {
  if (!showDisplayMenu.value) return;
  const menuEl = displayMenuRef.value;
  if (!menuEl || menuEl.contains(event.target)) return;
  showDisplayMenu.value = false;
}

function updatePairGhostPosition(x, y) {
  if (!pairingDragState?.ghost) return;
  pairingDragState.ghost.style.transform = `translate(${x - pairingDragState.offsetX}px, ${
    y - pairingDragState.offsetY
  }px)`;
}

function findPairSlotIndex(x, y) {
  const el = document.elementFromPoint(x, y);
  const slot = el?.closest?.(".pairing-slot");
  if (!slot) return null;
  const idx = Number(slot.dataset.index);
  return Number.isFinite(idx) ? idx : null;
}

function cleanupPairDrag(event) {
  window.removeEventListener("pointermove", onPairPointerMove);
  window.removeEventListener("pointerup", onPairPointerUp);
  window.removeEventListener("pointercancel", onPairPointerUp);
  if (pairingDragState?.element && pairingDragState.pointerId != null) {
    try {
      pairingDragState.element.releasePointerCapture(pairingDragState.pointerId);
    } catch {
      // ignore release errors
    }
  }
  if (pairingDragState?.ghost) {
    pairingDragState.ghost.remove();
  }
  if (pairingDragState?.moved) {
    pairingDragEndedAt = Date.now();
  }
  pairingDragState = null;
  draggingPairIndex.value = null;
  pairingHoverIndex.value = null;
}

function playerNameById(id) {
  const player = playerMap.value.get(id);
  return player ? player.nickname || player.fullName : "Unknown";
}

function selectPairSlot(index) {
  if (!pairingOrder.value[index]) return;
  if (draggingPairIndex.value != null) return;
  if (Date.now() - pairingDragEndedAt < 250) return;
  if (pairingSelectedIndex.value == null) {
    pairingSelectedIndex.value = index;
    return;
  }
  if (pairingSelectedIndex.value === index) {
    pairingSelectedIndex.value = null;
    return;
  }
  const next = pairingOrder.value.slice();
  const temp = next[index];
  next[index] = next[pairingSelectedIndex.value];
  next[pairingSelectedIndex.value] = temp;
  pairingOrder.value = next;
  pairingSelectedIndex.value = null;
}

async function attemptQueue(order) {
  if (hasDuplicateSelection(order)) {
    openDuplicateWarning(order);
    return;
  }
  await enqueueSelectedPlayers(order);
}

watch(
  () => selectedIds.value.join("|"),
  (signature) => {
    if (sessionGameType.value !== "doubles") return;
    if (selectedIds.value.length !== 4) return;
    if (showPairingModal.value) return;
    if (signature && signature !== lastPairingSignature.value) {
      lastPairingSignature.value = signature;
      openPairingModal();
    }
  }
);

watch(showPairingModal, (isOpen) => {
  document.body.style.overflow = isOpen ? "hidden" : "";
  if (!isOpen) {
    cleanupPairDrag();
  }
});

async function confirmRemoveSelected() {
  showRemoveConfirm.value = false;
  removeError.value = "";
  if (!session.value || selectedIds.value.length === 0) {
    removeConfirmNames.value = [];
    return;
  }
  try {
    for (const playerId of selectedIds.value) {
      await api.checkoutPlayer(playerId, { sessionId: session.value.id, status: "done" });
    }
    selectedIds.value = [];
    await load();
  } catch (err) {
    removeError.value = err.message || "Unable to remove player";
  } finally {
    removeConfirmNames.value = [];
  }
}

watch(sessionGameType, () => {
  selectedIds.value = [];
});

onMounted(() => {
  load();
  timerId = setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
  document.addEventListener("click", handleDisplayMenuOutsideClick);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
  document.body.style.overflow = "";
  cleanupPairDrag();
  document.removeEventListener("click", handleDisplayMenuOutsideClick);
});
</script>
