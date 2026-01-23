<template>
  <div class="card stack">
    <div class="section-title">Join Session</div>
    <div v-if="loading" class="subtitle">Loading...</div>
    <div v-else-if="error" class="notice">{{ error }}</div>
    <div v-else class="stack">
      <div class="subtitle">Session</div>
      <strong>{{ session?.name }}</strong>
      <div class="subtitle">{{ session?.status }}</div>

      <input class="input" v-model="fullName" placeholder="Full name" />
      
      <label class="radio-row">
        <input type="checkbox" v-model="newPlayer" />
        New Player
      </label>

      <button class="button" @click="submit">Submit</button>
      <button class="button ghost" @click="openPlayers">View Joined Players</button>
      <div v-if="success" class="notice">You're checked in!</div>
    </div>
  </div>
  <div v-if="showPlayers" class="modal-backdrop">
    <div class="modal-card join-modal compact">
      <div class="kpi">
        <div>
          <div class="subtitle">Joined Players</div>
          <strong>{{ session?.name }}</strong>
        </div>
        <span class="badge neutral">{{ visibleJoinedPlayers.length }}</span>
      </div>
      <div v-if="playersError" class="notice">{{ playersError }}</div>
      <div v-else-if="playersLoading" class="subtitle">Loading...</div>
      <div v-else-if="visibleJoinedPlayers.length === 0" class="subtitle">No players yet.</div>
      <div v-else class="stack join-player-list">
        <div
          v-for="sp in joinedPlayersWithOrder"
          :key="sp.playerId"
          class="join-player-card"
          :class="{ 'new-player': sp.isNewPlayer, 'over-limit': sp.overLimit }"
        >
          <div class="join-player-row">
            <span class="join-player-order">{{ sp.orderLabel }}</span>
            <div>
              <div class="join-player-name">
                <strong>{{ sp.player.nickname || sp.player.fullName }}</strong>
                <span v-if="sp.isNewPlayer" class="new-player-pill">New</span>
              </div>
              <div class="subtitle">{{ sp.player.fullName }}</div>
            </div>
          </div>
        </div>
      </div>
      <button class="button" @click="closePlayers">Close</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api.js";

const route = useRoute();
const session = ref(null);
const loading = ref(true);
const error = ref("");
const success = ref(false);
const fullName = ref("");
const newPlayer = ref(false);
const showPlayers = ref(false);
const joinedPlayers = ref([]);
const playersLoading = ref(false);
const playersError = ref("");
const regularJoinLimit = ref(0);
const newJoinerLimit = ref(0);

const visibleJoinedPlayers = computed(() =>
  joinedPlayers.value.filter((sp) => sp.status !== "done")
);

const joinedPlayersWithOrder = computed(() => {
  let regularIndex = 0;
  let newIndex = 0;
  return visibleJoinedPlayers.value.map((sp) => {
    if (sp.isNewPlayer) {
      newIndex += 1;
      return {
        ...sp,
        orderLabel: `n${newIndex}`,
        overLimit: newJoinerLimit.value > 0 && newIndex > newJoinerLimit.value
      };
    }
    regularIndex += 1;
    return {
      ...sp,
      orderLabel: `r${regularIndex}`,
      overLimit: regularJoinLimit.value > 0 && regularIndex > regularJoinLimit.value
    };
  });
});

async function load() {
  try {
    const data = await api.publicSessionInvite(route.params.token);
    session.value = data.session;
  } catch (err) {
    error.value = err.message || "Unable to load session";
  } finally {
    loading.value = false;
  }
}

async function submit() {
  error.value = "";
  success.value = false;
  if (!fullName.value.trim()) {
    error.value = "Full name is required";
    return;
  }
  try {
    await api.publicSessionRegister(route.params.token, {
      fullName: fullName.value.trim(),
      newPlayer: newPlayer.value
    });
    success.value = true;
    fullName.value = "";
    newPlayer.value = false;
  } catch (err) {
    error.value = err.message || "Unable to register";
  }
}

async function openPlayers() {
  showPlayers.value = true;
  playersError.value = "";
  playersLoading.value = true;
  try {
    const data = await api.publicSessionInvitePlayers(route.params.token);
    joinedPlayers.value = data.players || [];
    regularJoinLimit.value = Number(data.session?.regularJoinLimit || 0);
    newJoinerLimit.value = Number(data.session?.newJoinerLimit || 0);
  } catch (err) {
    playersError.value = err.message || "Unable to load players";
    joinedPlayers.value = [];
    regularJoinLimit.value = 0;
    newJoinerLimit.value = 0;
  } finally {
    playersLoading.value = false;
  }
}

function closePlayers() {
  showPlayers.value = false;
}

onMounted(load);
</script>
