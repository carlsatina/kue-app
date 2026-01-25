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
                <template v-if="selectionTab === 'players'">
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
                </template>
                <template v-else>
                  <input class="input" v-model="teamSearch" placeholder="Search teams" />
                  <button class="button ghost button-compact" @click="clearTeamSearch">Clear</button>
                </template>
              </div>
            </div>

            <div class="selection-header">
              <div v-if="sessionGameType === 'doubles'" class="segmented inner-tabs">
                <button
                  class="segment"
                  :class="{ active: selectionTab === 'players' }"
                  type="button"
                  @click="selectionTab = 'players'"
                >
                  Pick
                </button>
                <button
                  class="segment"
                  :class="{ active: selectionTab === 'teams' }"
                  type="button"
                  @click="selectionTab = 'teams'"
                >
                  Teams
                </button>
              </div>
              <div class="game-type inline">
                <span class="subtitle">Game type</span>
                <span class="subtitle compact">{{ sessionGameTypeLabel }}</span>
              </div>
            </div>

            <template v-if="selectionTab === 'players'">
              <div class="subtitle">Pick {{ selectionLimit }} Players to Start</div>
              <div class="player-grid">
                <div
                  v-for="player in filteredPlayers"
                  :key="player.id"
                  class="player-card"
                  :class="{
                    selected: sessionIsOpen && selectedIds.includes(player.id),
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
              <div class="subtitle players-count">{{ filteredPlayers.length }} Players Available</div>

              <div class="inline-actions">
                <button class="button button-compact" :disabled="!canAdd" @click="addToQueue">Add to Queue</button>
                <button
                  v-if="showMarkPresent"
                  class="button secondary button-compact"
                  :disabled="selectedIds.length === 0 || !sessionIsOpen"
                  @click="markPresent"
                >
                  Mark Present
                </button>
                <button
                  class="button ghost danger button-compact"
                  :disabled="selectedIds.length === 0"
                  @click="openRemoveConfirm"
                >
                  Remove
                </button>
              </div>
            </template>

            <div v-if="sessionGameType === 'doubles' && selectionTab === 'teams'" class="team-select">
              <div class="team-select-head">
                <div>
                  <div class="subtitle">Team Builder Teams</div>
                  <div class="subtitle compact">Select 2 teams to queue a match.</div>
                </div>
                <router-link class="button button-compact blue-gradient" to="/team-builder">
                  Open Team Builder
                </router-link>
              </div>
              <div v-if="filteredTeamOptions.length === 0" class="subtitle compact">
                No teams yet.
              </div>
              <div v-else class="team-select-grid">
                <button
                  v-for="team in filteredTeamOptions"
                  :key="team.id"
                  class="team-select-card"
                  :class="{
                    selected: selectedTeamIds.includes(team.id),
                    disabled: isTeamDisabled(team)
                  }"
                  type="button"
                  :disabled="isTeamDisabled(team)"
                  @click="toggleTeamSelection(team)"
                >
                  <div class="team-select-headline">
                    <div class="team-select-name">{{ team.displayName }}</div>
                    <span v-if="team.status" class="team-status-pill" :class="team.status.toLowerCase()">
                      {{ team.status }}
                    </span>
                  </div>
                  <div class="team-select-members">
                    <span v-if="team.source === 'auto'" class="team-select-pill auto">Auto</span>
                    <span v-else class="team-select-pill manual">Manual</span>
                  </div>
                </button>
              </div>
              <div class="team-select-actions">
                <button class="button button-compact" :disabled="!canAddTeams" @click="addSelectedTeams">
                  Add Team{{ selectedTeamIds.length === 1 ? "" : "s" }} to Queue
                </button>
                <button
                  class="button ghost button-compact"
                  :disabled="selectedTeamIds.length === 0"
                  @click="clearTeamSelection"
                >
                  Clear
                </button>
              </div>
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
          <input class="input" v-model="fullName" placeholder="Enter player name" :disabled="!sessionIsOpen" />
          <div class="chip-row">
            <button
              v-for="level in skillLevels"
              :key="level"
              class="chip"
              :class="{ active: skillLevel === level }"
              type="button"
              :disabled="!sessionIsOpen"
              @click="skillLevel = level"
            >
              {{ level }}
            </button>
          </div>
          <button class="button" @click="addPlayer" :disabled="!sessionIsOpen">Add Player</button>
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
          <div class="history-right">
            <div class="history-time">{{ formatTime(match.endedAt || match.startedAt) }}</div>
            <button
              v-if="match.status === 'ended'"
              class="button ghost button-compact history-edit-button"
              @click="openEditResult(match)"
            >
              Edit Result
            </button>
          </div>
        </div>
        <div class="history-vs compact">
          <div class="history-team" :class="{ winner: match.winnerTeam === 1 }">
            <span class="history-team-name">{{ teamNames(match, 1) }}</span>
            <span v-if="match.winnerTeam === 1" class="history-crown">🏆</span>
            <span v-if="matchScore(match, 1) != null" class="history-score-pill">
              {{ matchScore(match, 1) }}
            </span>
          </div>
          <span class="history-vs-pill">vs</span>
          <div class="history-team" :class="{ winner: match.winnerTeam === 2 }">
            <span class="history-team-name">{{ teamNames(match, 2) }}</span>
            <span v-if="match.winnerTeam === 2" class="history-crown">🏆</span>
            <span v-if="matchScore(match, 2) != null" class="history-score-pill">
              {{ matchScore(match, 2) }}
            </span>
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
    <div v-if="showSinglesQueueModal" class="modal-backdrop">
      <div class="modal-card">
        <h3>Queue singles match</h3>
        <div class="subtitle">Confirm these players.</div>
        <div class="singles-match-row">
          <div v-if="singlesQueueOrder[0]" class="singles-pill singles-pill-a">
            {{ playerNameById(singlesQueueOrder[0]) }}
          </div>
          <div class="singles-vs">vs</div>
          <div v-if="singlesQueueOrder[1]" class="singles-pill singles-pill-b">
            {{ playerNameById(singlesQueueOrder[1]) }}
          </div>
        </div>
        <div class="grid two">
          <button class="button" @click="confirmSinglesQueueAdd">Add to Queue</button>
          <button class="button ghost" @click="closeSinglesQueueModal">Cancel</button>
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
    <div v-if="showEditResult" class="modal-backdrop">
      <div class="modal-card match-modal compact">
        <div class="match-modal-head">
          <div>
            <div class="subtitle">Edit match result</div>
            <h3>Update Result</h3>
          </div>
          <span class="match-burst">🏸</span>
        </div>
        <div v-if="editResultError" class="notice">{{ editResultError }}</div>
        <div class="winner-grid">
          <div class="winner-card team-a">
            <div class="winner-row">
              <div class="winner-info">
                <div class="subtitle">Team A</div>
                <strong>{{ editResultTeams.teamA }}</strong>
              </div>
              <input
                class="input winner-score-input"
                type="number"
                min="0"
                v-model="editResultScoreA"
                placeholder="Score"
              />
            </div>
            <button class="button button-compact" @click="saveEditedResult(1)">Team A Wins</button>
          </div>
          <div class="winner-card team-b">
            <div class="winner-row">
              <div class="winner-info">
                <div class="subtitle">Team B</div>
                <strong>{{ editResultTeams.teamB }}</strong>
              </div>
              <input
                class="input winner-score-input"
                type="number"
                min="0"
                v-model="editResultScoreB"
                placeholder="Score"
              />
            </div>
            <button class="button button-compact secondary" @click="saveEditedResult(2)">Team B Wins</button>
          </div>
        </div>
        <div class="match-modal-actions">
          <button class="button ghost button-compact draw-button" @click="saveEditedResult(null)">Draw</button>
          <button class="button ghost button-compact" @click="closeEditResult">Cancel</button>
        </div>
      </div>
    </div>
    <div v-if="showTeamQueueModal" class="modal-backdrop">
      <div class="modal-card">
        <h3>Queue teams</h3>
        <div class="subtitle">Confirm this match pairing.</div>
        <div class="singles-match-row">
          <div v-if="teamQueueOrder[0]" class="singles-pill singles-pill-a">
            {{ teamNameById(teamQueueOrder[0]) }}
          </div>
          <div class="singles-vs">vs</div>
          <div v-if="teamQueueOrder[1]" class="singles-pill singles-pill-b">
            {{ teamNameById(teamQueueOrder[1]) }}
          </div>
        </div>
        <div class="grid two">
          <button class="button" @click="confirmTeamQueueAdd">Add to Queue</button>
          <button class="button ghost" @click="closeTeamQueueModal">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { api } from "../api.js";
import { loadManualTeams } from "../utils/teamBuilder.js";
import { selectedSessionId, setSelectedSessionId } from "../state/sessionStore.js";

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
const teamSearch = ref("");
const displayMenuRef = ref(null);
const sessionIsOpen = computed(() => session.value?.status === "open");
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
const showSinglesQueueModal = ref(false);
const singlesQueueOrder = ref([]);
const lastSinglesSignature = ref("");
const manualTeams = ref([]);
const selectedTeamIds = ref([]);
const pendingQueueTeams = ref([]);
const pendingQueueMode = ref("players");
const selectionTab = ref("players");
const showTeamQueueModal = ref(false);
const teamQueueOrder = ref([]);
const lastTeamQueueSignature = ref("");
const showEditResult = ref(false);
const editResultMatchId = ref("");
const editResultTeams = ref({ teamA: "—", teamB: "—" });
const editResultScoreA = ref("");
const editResultScoreB = ref("");
const editResultError = ref("");

const skillLevels = ["Beginner", "Intermediate", "Advance", "Elite"];

const sessionGameType = computed(() => {
  const raw = session.value?.gameType || "doubles";
  const normalized = typeof raw === "string" ? raw.toLowerCase() : "doubles";
  return normalized === "single" ? "singles" : normalized;
});
const sessionGameTypeLabel = computed(() =>
  sessionGameType.value === "singles" ? "Singles" : "Doubles"
);
const selectionLimit = computed(() => (sessionGameType.value === "singles" ? 2 : 4));

const sessionPlayerMap = computed(() => {
  const map = new Map();
  sessionPlayers.value.forEach((sp) => map.set(sp.playerId, sp));
  return map;
});

const activeSessionPlayerIds = computed(() => {
  return new Set(sessionPlayers.value.filter((sp) => sp.status !== "done").map((sp) => sp.playerId));
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

const queuedTeamKeys = computed(() => {
  const keys = new Set();
  queueEntries.value.forEach((entry) => {
    const ids = entry.players.map((p) => p.playerId).filter(Boolean);
    if (ids.length >= 2) {
      keys.add(teamKey(ids));
    }
  });
  return keys;
});

const playingTeamKeys = computed(() => {
  const keys = new Set();
  if (!session.value?.courtSessions) return keys;
  session.value.courtSessions.forEach((courtSession) => {
    const participants = courtSession.currentMatch?.participants || [];
    if (!participants.length) return;
    const team1Ids = participants.filter((p) => p.teamNumber === 1).map((p) => p.playerId).filter(Boolean);
    const team2Ids = participants.filter((p) => p.teamNumber === 2).map((p) => p.playerId).filter(Boolean);
    if (team1Ids.length) keys.add(teamKey(team1Ids));
    if (team2Ids.length) keys.add(teamKey(team2Ids));
  });
  return keys;
});

const sessionPlayerList = computed(() => {
  if (!session.value) return [];
  return sessionPlayers.value.filter((sp) => sp.status !== "done").map((sp) => sp.player);
});

const joinedPlayersForTeams = computed(() => {
  return sessionPlayers.value
    .filter((sp) => sp.status !== "done")
    .sort((a, b) => new Date(a.checkedInAt) - new Date(b.checkedInAt))
    .map((sp) => ({
      id: sp.player.id,
      name: sp.player.nickname || sp.player.fullName
    }));
});

const filteredPlayers = computed(() => {
  const q = search.value.trim().toLowerCase();
  return sessionPlayerList.value.filter((p) => {
    const name = `${p.fullName} ${p.nickname || ""}`.toLowerCase();
    const matchesSearch = !q || name.includes(q);
    return matchesSearch;
  });
});

const canAdd = computed(() => selectedIds.value.length === selectionLimit.value && session.value && sessionIsOpen.value);
const canAddTeams = computed(
  () =>
    session.value &&
    sessionIsOpen.value &&
    sessionGameType.value === "doubles" &&
    selectedTeamIds.value.length === 2
);

const queueMatchCount = computed(() => queueMatches.value.length);

const manualAssignedIds = computed(() => {
  return new Set(
    manualTeams.value
      .flatMap((team) => team.memberIds || [])
      .filter((id) => typeof id === "string" && id.length > 0)
  );
});

const autoTeams = computed(() => {
  const available = joinedPlayersForTeams.value.filter((player) => !manualAssignedIds.value.has(player.id));
  return buildAutoTeams(available);
});

const teamOptions = computed(() => {
  if (!session.value || sessionGameType.value !== "doubles") return [];
  const manualList = manualTeams.value.map((team) => ({
    ...team,
    memberIds: Array.isArray(team.memberIds) ? team.memberIds : []
  }));
  const manualKeys = new Set(manualList.map((team) => teamKey(team.memberIds)));
  const mergedTeams = [
    ...manualList,
    ...autoTeams.value.filter((team) => !manualKeys.has(teamKey(team.memberIds || [])))
  ];
  return mergedTeams.map((team) => {
    const memberIds = Array.isArray(team.memberIds) ? team.memberIds : [];
    const memberNames = memberIds
      .map((id) => sessionPlayerMap.value.get(id)?.player || playerMap.value.get(id))
      .filter(Boolean)
      .map((player) => player.nickname || player.fullName);
    const missingMembers = memberIds.some((id) => !activeSessionPlayerIds.value.has(id));
    return {
      ...team,
      memberIds,
      memberNames,
      displayName: memberNames.length ? memberNames.join(" + ") : team.name || "Team",
      missingMembers,
      status: resolveTeamStatus(memberIds, missingMembers, team.disabled)
    };
  });
});

const filteredTeamOptions = computed(() => {
  if (!teamSearch.value.trim()) return teamOptions.value;
  const term = teamSearch.value.trim().toLowerCase();
  return teamOptions.value.filter((team) => {
    if ((team.displayName || "").toLowerCase().includes(term)) return true;
    if (team.memberNames?.some((name) => name.toLowerCase().includes(term))) return true;
    return false;
  });
});

const teamOptionMap = computed(() => new Map(teamOptions.value.map((team) => [team.id, team])));

function isReadyForPresent(sp) {
  if (!sp) return false;
  if (sp.status === "ready") return true;
  if (sp.status === "checked_in") return !sp.lastPlayedAt;
  return false;
}

const showMarkPresent = computed(
  () =>
    sessionIsOpen.value &&
    selectedIds.value.some((playerId) => isReadyForPresent(sessionPlayerMap.value.get(playerId)))
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
  if (sp.status === "checked_in" || sp.status === "ready") {
    if (!sessionIsOpen.value) return "Ready";
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
  if (sp.status === "checked_in" || sp.status === "ready") {
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
  if (!sessionIsOpen.value) return;
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

function toggleTeamSelection(team) {
  if (!sessionIsOpen.value) return;
  if (!team || isTeamDisabled(team)) return;
  if (selectedTeamIds.value.includes(team.id)) {
    selectedTeamIds.value = selectedTeamIds.value.filter((id) => id !== team.id);
    return;
  }
  if (selectedTeamIds.value.length >= 2) return;
  selectedTeamIds.value = [...selectedTeamIds.value, team.id];
}

function clearTeamSelection() {
  selectedTeamIds.value = [];
}

function clearTeamSearch() {
  teamSearch.value = "";
}

function teamNameById(id) {
  return teamOptionMap.value.get(id)?.displayName || "Team";
}

function isTeamDisabled(team) {
  if (!team) return true;
  if (!sessionIsOpen.value) return true;
  if (team.disabled) return true;
  if (!team.memberIds || team.memberIds.length < 2) return true;
  if (team.missingMembers) return true;
  return false;
}

function resolveTeamStatus(memberIds, missingMembers, disabled) {
  if (!memberIds || memberIds.length < 2) return "";
  if (missingMembers || disabled) return "";
  const key = teamKey(memberIds);
  if (playingTeamKeys.value.has(key)) return "Playing";
  if (queuedTeamKeys.value.has(key)) return "Queued";
  return "";
}

function buildAutoTeams(players) {
  const teams = [];
  for (let i = 0; i < players.length; i += 2) {
    const first = players[i];
    const second = players[i + 1];
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

function teamKey(ids) {
  return ids.slice().sort().join("+");
}

async function load() {
  players.value = await api.listPlayers();
  let currentSession = null;
  if (selectedSessionId.value) {
    try {
      currentSession = await api.session(selectedSessionId.value);
    } catch {
      setSelectedSessionId("");
    }
  }
  if (!currentSession) {
    try {
      currentSession = await api.activeSession();
    } catch {
      currentSession = null;
    }
    if (currentSession?.id) setSelectedSessionId(currentSession.id);
  }
  session.value = currentSession;
  if (!currentSession) {
    queueEntries.value = [];
    sessionPlayers.value = [];
    matches.value = [];
    manualTeams.value = [];
    selectedTeamIds.value = [];
    return;
  }

  const [queueResult, playersResult, matchesResult] = await Promise.allSettled([
    api.getQueue(currentSession.id),
    api.sessionPlayers(currentSession.id),
    api.matchHistory(currentSession.id)
  ]);

  queueEntries.value = queueResult.status === "fulfilled" ? queueResult.value : [];
  sessionPlayers.value = playersResult.status === "fulfilled" ? playersResult.value : [];
  matches.value = matchesResult.status === "fulfilled" ? matchesResult.value : [];
  manualTeams.value = sessionGameType.value === "doubles" ? loadManualTeams(currentSession.id) : [];
}

async function addPlayer() {
  addError.value = "";
  if (!fullName.value.trim()) {
    addError.value = "Player name is required.";
    return;
  }
  try {
    const created = await api.createPlayer({ fullName: fullName.value.trim(), skillLevel: skillLevel.value });
    if (session.value?.id && sessionIsOpen.value) {
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
    if (!sp || (sp.status !== "checked_in" && sp.status !== "present" && sp.status !== "ready")) {
      await api.checkinPlayer(playerId, { sessionId: session.value.id });
    }
  }
}

async function addToQueue() {
  if (!session.value || !sessionIsOpen.value) {
    queueError.value = "Session is not open.";
    return;
  }
  queueError.value = "";
  removeError.value = "";
  presentError.value = "";
  if (selectedIds.value.length !== selectionLimit.value) {
    queueError.value = `Select ${selectionLimit.value} players.`;
    return;
  }

  try {
    if (sessionGameType.value === "singles" && selectedIds.value.length === 2) {
      if (!showSinglesQueueModal.value) openSinglesQueueModal();
      return;
    }
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
  if (!session.value || !sessionIsOpen.value || selectedIds.value.length === 0) return;
  presentError.value = "";
  try {
    const readyIds = selectedIds.value.filter((playerId) =>
      isReadyForPresent(sessionPlayerMap.value.get(playerId))
    );
    if (readyIds.length === 0) return;
    for (const playerId of readyIds) {
      await api.presentPlayer(playerId, { sessionId: session.value.id });
    }
    await load();
    clearSelection();
  } catch (err) {
    presentError.value = err.message || "Unable to mark present";
  }
}

async function removeEntry(entryId) {
  if (!session.value || !sessionIsOpen.value) return;
  await api.dequeue(session.value.id, { entryId });
  await load();
}

async function assignMatch(match, court) {
  if (!session.value || !sessionIsOpen.value) return;
  await api.startMatch(session.value.id, {
    courtSessionId: court.id,
    matchType: match.matchType,
    teams: match.teamIds,
    entryIds: match.entryIds
  });
  await load();
}

async function cancelQueuedMatch(match) {
  if (!session.value || !sessionIsOpen.value) return;
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

function parseScoreValue(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function matchScore(match, teamNumber) {
  if (!match) return null;
  const score = extractScore(match.scoreJson);
  if (!score) return null;
  return teamNumber === 1 ? score.team1 ?? null : score.team2 ?? null;
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

function openEditResult(match) {
  if (!match || match.status !== "ended") return;
  editResultError.value = "";
  editResultMatchId.value = match.id;
  editResultTeams.value = {
    teamA: teamNames(match, 1) || "—",
    teamB: teamNames(match, 2) || "—"
  };
  const score = extractScore(match.scoreJson);
  editResultScoreA.value = score?.team1 ?? "";
  editResultScoreB.value = score?.team2 ?? "";
  showEditResult.value = true;
}

function closeEditResult() {
  showEditResult.value = false;
  editResultMatchId.value = "";
  editResultTeams.value = { teamA: "—", teamB: "—" };
  editResultScoreA.value = "";
  editResultScoreB.value = "";
  editResultError.value = "";
}

function hasDuplicateSelection(order = selectedIds.value) {
  return order.some((playerId) => queuedIds.value.has(playerId) || playingIds.value.has(playerId));
}

function openDuplicateWarning(order = selectedIds.value) {
  pendingQueueOrder.value = order.slice();
  pendingQueueMode.value = "players";
  pendingQueueTeams.value = [];
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
  pendingQueueTeams.value = [];
  pendingQueueMode.value = "players";
}

async function confirmDuplicateWarning() {
  showDuplicateWarning.value = false;
  try {
    if (pendingQueueMode.value === "teams") {
      await enqueueSelectedTeams(pendingQueueTeams.value);
    } else {
      await enqueueSelectedPlayers(pendingQueueOrder.value || selectedIds.value);
    }
  } catch (err) {
    queueError.value = err.message || "Unable to add to queue";
  } finally {
    duplicateWarningNames.value = [];
    pendingQueueOrder.value = null;
    pendingQueueTeams.value = [];
    pendingQueueMode.value = "players";
  }
}

function openDuplicateWarningForTeams(playerIds, teamIds) {
  pendingQueueOrder.value = playerIds.slice();
  pendingQueueMode.value = "teams";
  pendingQueueTeams.value = teamIds.slice();
  duplicateWarningNames.value = playerIds
    .filter((playerId) => queuedIds.value.has(playerId) || playingIds.value.has(playerId))
    .map((id) => players.value.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => p.nickname || p.fullName);
  showDuplicateWarning.value = true;
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

async function enqueueSelectedTeams(teamIds = selectedTeamIds.value) {
  if (!session.value || sessionGameType.value !== "doubles") return;
  const teamMap = new Map(teamOptions.value.map((team) => [team.id, team]));
  const teams = teamIds.map((id) => teamMap.get(id)).filter(Boolean);
  const allPlayers = teams.flatMap((team) => team.memberIds || []);
  if (!allPlayers.length) return;
  await ensureCheckedIn(allPlayers);
  for (const team of teams) {
    if (!team.memberIds || team.memberIds.length < 2) continue;
    await api.enqueue(session.value.id, { type: "doubles", playerIds: team.memberIds });
  }
  selectedTeamIds.value = [];
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

function openSinglesQueueModal() {
  singlesQueueOrder.value = selectedIds.value.slice(0, 2);
  showSinglesQueueModal.value = true;
}

function closeSinglesQueueModal() {
  showSinglesQueueModal.value = false;
  singlesQueueOrder.value = [];
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

function openTeamQueueModal() {
  teamQueueOrder.value = selectedTeamIds.value.slice(0, 2);
  showTeamQueueModal.value = true;
}

function closeTeamQueueModal() {
  showTeamQueueModal.value = false;
  teamQueueOrder.value = [];
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

async function confirmTeamQueueAdd() {
  if (!session.value || teamQueueOrder.value.length !== 2) return;
  showTeamQueueModal.value = false;
  try {
    await attemptQueueTeams(teamQueueOrder.value);
  } catch (err) {
    queueError.value = err.message || "Unable to add teams to queue";
  } finally {
    teamQueueOrder.value = [];
  }
}

async function saveEditedResult(winnerTeam) {
  if (!session.value || !editResultMatchId.value) return;
  editResultError.value = "";
  try {
    const payload = { matchId: editResultMatchId.value, winnerTeam };
    const scoreA = parseScoreValue(editResultScoreA.value);
    const scoreB = parseScoreValue(editResultScoreB.value);
    if (scoreA != null || scoreB != null) {
      const score = {};
      if (scoreA != null) score.team1 = scoreA;
      if (scoreB != null) score.team2 = scoreB;
      payload.score = score;
    }
    await api.updateMatchResult(session.value.id, payload);
    closeEditResult();
    await load();
  } catch (err) {
    editResultError.value = err.message || "Unable to update match result";
  }
}

async function confirmSinglesQueueAdd() {
  if (!session.value || singlesQueueOrder.value.length !== 2) return;
  showSinglesQueueModal.value = false;
  try {
    await attemptQueue(singlesQueueOrder.value);
  } catch (err) {
    queueError.value = err.message || "Unable to add to queue";
  } finally {
    singlesQueueOrder.value = [];
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

async function addSelectedTeams() {
  if (!session.value || !sessionIsOpen.value) {
    queueError.value = "Session is not open.";
    return;
  }
  queueError.value = "";
  const teamMap = new Map(teamOptions.value.map((team) => [team.id, team]));
  const teams = selectedTeamIds.value.map((id) => teamMap.get(id)).filter(Boolean);
  if (teams.length !== 2) {
    queueError.value = "Select 2 teams.";
    return;
  }
  if (!showTeamQueueModal.value) {
    openTeamQueueModal();
    return;
  }
  await attemptQueueTeams(selectedTeamIds.value);
}

async function attemptQueueTeams(teamIds) {
  if (!session.value || !sessionIsOpen.value) {
    queueError.value = "Session is not open.";
    return;
  }
  const teamMap = new Map(teamOptions.value.map((team) => [team.id, team]));
  const teams = teamIds.map((id) => teamMap.get(id)).filter(Boolean);
  if (teams.length !== 2) {
    queueError.value = "Select 2 teams.";
    return;
  }
  const invalid = teams.some((team) => isTeamDisabled(team));
  if (invalid) {
    queueError.value = "One or more teams are missing players.";
    return;
  }
  const playerIds = teams.flatMap((team) => team.memberIds || []);
  if (hasDuplicateSelection(playerIds)) {
    openDuplicateWarningForTeams(playerIds, teams.map((team) => team.id));
    return;
  }
  try {
    await enqueueSelectedTeams(teams.map((team) => team.id));
  } catch (err) {
    queueError.value = err.message || "Unable to add teams to queue";
  }
}

watch(
  () => selectedTeamIds.value.join("|"),
  (signature) => {
    if (sessionGameType.value !== "doubles") return;
    if (selectionTab.value !== "teams") return;
    if (selectedTeamIds.value.length !== 2) {
      if (showTeamQueueModal.value) closeTeamQueueModal();
      lastTeamQueueSignature.value = "";
      return;
    }
    if (showTeamQueueModal.value) return;
    if (signature && signature !== lastTeamQueueSignature.value) {
      lastTeamQueueSignature.value = signature;
      openTeamQueueModal();
    }
  }
);

watch(
  () => selectedIds.value.join("|"),
  (signature) => {
    if (sessionGameType.value === "singles") {
      if (selectedIds.value.length !== 2) {
        if (showSinglesQueueModal.value) closeSinglesQueueModal();
        return;
      }
      if (showSinglesQueueModal.value) return;
      if (signature && signature !== lastSinglesSignature.value) {
        lastSinglesSignature.value = signature;
        openSinglesQueueModal();
      }
      return;
    }
    if (sessionGameType.value !== "doubles") return;
    if (selectedIds.value.length !== 4) return;
    if (showPairingModal.value) return;
    if (signature && signature !== lastPairingSignature.value) {
      lastPairingSignature.value = signature;
      openPairingModal();
    }
  }
);

watch(
  [showPairingModal, showSinglesQueueModal, showTeamQueueModal, showEditResult],
  ([pairingOpen, singlesOpen, teamOpen, editOpen]) => {
    document.body.style.overflow = pairingOpen || singlesOpen || teamOpen || editOpen ? "hidden" : "";
    if (!pairingOpen) {
      cleanupPairDrag();
    }
  }
);

watch(sessionIsOpen, (isOpen) => {
  if (!isOpen) {
    selectedIds.value = [];
    selectedTeamIds.value = [];
    teamSearch.value = "";
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    return;
  }
  if (!timerId) {
    timerId = setInterval(() => {
      nowTick.value = Date.now();
    }, 1000);
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
  lastSinglesSignature.value = "";
  lastPairingSignature.value = "";
  lastTeamQueueSignature.value = "";
  if (sessionGameType.value !== "doubles") {
    selectedTeamIds.value = [];
    manualTeams.value = [];
    teamSearch.value = "";
    selectionTab.value = "players";
    return;
  }
  if (session.value?.id) {
    manualTeams.value = loadManualTeams(session.value.id);
  }
});

watch(selectedSessionId, () => {
  selectedIds.value = [];
  selectedTeamIds.value = [];
  teamSearch.value = "";
  lastTeamQueueSignature.value = "";
  selectionTab.value = "players";
  closeEditResult();
  load();
});

watch(teamOptions, (teams) => {
  const ids = new Set(teams.map((team) => team.id));
  selectedTeamIds.value = selectedTeamIds.value.filter((id) => ids.has(id));
});

onMounted(() => {
  load();
  if (sessionIsOpen.value) {
    timerId = setInterval(() => {
      nowTick.value = Date.now();
    }, 1000);
  }
  document.addEventListener("click", handleDisplayMenuOutsideClick);
});

onUnmounted(() => {
  if (timerId) clearInterval(timerId);
  document.body.style.overflow = "";
  cleanupPairDrag();
  document.removeEventListener("click", handleDisplayMenuOutsideClick);
});
</script>
