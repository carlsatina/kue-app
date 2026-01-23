import { ref } from "vue";

const STORAGE_KEY = "kue:selected-session";

const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : "";
const selectedSessionId = ref(stored || "");
const pendingSessionId = ref("");

function setSelectedSessionId(id) {
  const value = id || "";
  selectedSessionId.value = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore storage errors
  }
}

function setPendingSessionId(id) {
  pendingSessionId.value = id || "";
}

export { selectedSessionId, setSelectedSessionId, pendingSessionId, setPendingSessionId };
