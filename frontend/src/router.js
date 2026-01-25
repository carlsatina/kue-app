import { createRouter, createWebHistory } from "vue-router";
import Login from "./pages/Login.vue";
import Register from "./pages/Register.vue";
import Dashboard from "./pages/Dashboard.vue";
import Players from "./pages/Players.vue";
import Fees from "./pages/Fees.vue";
import Rankings from "./pages/Rankings.vue";
import PublicPlayer from "./pages/PublicPlayer.vue";
import PublicBoard from "./pages/PublicBoard.vue";
import PublicQueue from "./pages/PublicQueue.vue";
import JoinSession from "./pages/JoinSession.vue";
import Tournament from "./pages/Tournament.vue";
import TeamBuilder from "./pages/TeamBuilder.vue";
import Profile from "./pages/Profile.vue";
import CheckEmail from "./pages/CheckEmail.vue";
import VerifyEmail from "./pages/VerifyEmail.vue";
import ForgotPassword from "./pages/ForgotPassword.vue";
import ResetPassword from "./pages/ResetPassword.vue";

const routes = [
  { path: "/login", component: Login, meta: { public: true } },
  { path: "/register", component: Register, meta: { public: true } },
  { path: "/p/:token", component: PublicPlayer, meta: { public: true } },
  { path: "/q/:token", component: PublicQueue, meta: { public: true } },
  { path: "/join/:token", component: JoinSession, meta: { public: true } },
  { path: "/board/:sessionId", component: PublicBoard, meta: { public: true } },
  { path: "/check-email", component: CheckEmail, meta: { public: true } },
  { path: "/verify", component: VerifyEmail, meta: { public: true } },
  { path: "/forgot-password", component: ForgotPassword, meta: { public: true } },
  { path: "/reset-password", component: ResetPassword, meta: { public: true } },
  { path: "/", component: Dashboard },
  { path: "/players", component: Players },
  { path: "/rankings", component: Rankings },
  { path: "/tournament", component: Tournament },
  { path: "/team-builder", component: TeamBuilder },
  { path: "/fees", component: Fees },
  { path: "/profile", component: Profile }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  if (to.meta.public) return true;
  const token = localStorage.getItem("token");
  if (!token) return "/login";
  return true;
});

export default router;
