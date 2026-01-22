<template>
  <div class="stack">
    <div class="card">
      <div class="section-title">{{ board.session?.name || 'Session Board' }}</div>
      <div class="subtitle">Live court status</div>
    </div>
    <div class="grid two">
      <div v-for="item in board.courts || []" :key="item.court.id" class="card court-card">
        <div class="kpi">
          <strong>{{ item.court.name }}</strong>
          <span class="badge" :class="item.status === 'maintenance' ? 'warning' : ''">{{ item.status }}</span>
        </div>
        <div class="subtitle">
          Now: {{ item.currentMatch ? matchLabel(item.currentMatch) : 'Open' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { api } from "../api.js";
import { useRoute } from "vue-router";

const route = useRoute();
const board = ref({});

function matchLabel(match) {
  const team1 = match.participants.filter((p) => p.teamNumber === 1).map((p) => p.player.nickname || p.player.fullName);
  const team2 = match.participants.filter((p) => p.teamNumber === 2).map((p) => p.player.nickname || p.player.fullName);
  return `${team1.join(' + ')} vs ${team2.join(' + ')}`;
}

async function load() {
  board.value = await api.publicBoard(route.params.sessionId);
}

onMounted(load);
</script>
