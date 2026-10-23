<template>
  <div>
    <div class="topbar">
      <div>
        <h1>Gaia — Modération</h1>
        <p class="topbar-meta">Validation des nouvelles utilisatrices, vérifications, signalements, messages</p>
      </div>
      <button class="g-btn" type="button" @click="loadAll">Actualiser</button>
    </div>

    <div v-if="error" class="error-box">{{ error }}</div>
    <div v-if="notice" class="g-notice">{{ notice }}</div>

    <div class="g-tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="g-tab"
        :class="{ active: tab === t.id }"
        @click="openTab(t.id)"
      >
        {{ t.label }}<span v-if="t.count" class="g-count">{{ t.count }}</span>
      </button>
    </div>

    <div class="g-layout">
      <section class="card g-main">
        <div v-if="loading" class="muted pad">Chargement…</div>

        <!-- À valider -->
        <template v-else-if="tab === 'review'">
          <div class="card-head"><h2>Nouvelles utilisatrices à valider</h2></div>
          <p v-if="!pendingUsers.length" class="muted pad">Aucune utilisatrice en attente.</p>
          <table v-else class="g-table">
            <thead><tr><th>Nom</th><th>Téléphone</th><th>Inscrite</th><th>Vocal</th><th>Photos</th></tr></thead>
            <tbody>
              <tr
                v-for="u in pendingUsers"
                :key="u.userId"
                :class="{ selected: selectedId === u.userId }"
                @click="selectUser(u.userId)"
              >
                <td>{{ u.displayName }}</td>
                <td>{{ u.phone }}</td>
                <td>{{ formatDateTime(u.createdAt) }}</td>
                <td>{{ u.hasVoice ? "oui" : "pas encore" }}</td>
                <td>{{ u.photoCount }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- Vérifications audio / vidéo -->
        <template v-else-if="tab === 'verifications'">
          <div class="card-head"><h2>Vérifications directes (audio / vidéo)</h2></div>
          <p v-if="!verifications.length" class="muted pad">Aucune demande de vérification.</p>
          <div v-for="r in verifications" :key="r.requestId" class="g-item">
            <div class="g-item-head">
              <a href="#" @click.prevent="selectUser(r.user.userId)"><strong>{{ r.user.displayName }}</strong></a>
              <span class="g-badge" :class="'v-' + r.status.toLowerCase()">{{ verificationLabel(r.status) }}</span>
            </div>
            <p class="muted small">
              Demandé : {{ requestedMediaLabel(r) }} · le {{ formatDateTime(r.createdAt) }}
              <template v-if="r.submittedAt"> · envoyé le {{ formatDateTime(r.submittedAt) }}</template>
            </p>
            <p v-if="r.prompt" class="small">Consigne : « {{ r.prompt }} »</p>
            <audio v-if="r.hasAudio" controls preload="none" :src="gaiaVerificationMediaUrl(r.requestId, 'audio')"></audio>
            <video
              v-if="r.hasVideo"
              controls
              preload="metadata"
              class="g-video"
              :src="gaiaVerificationMediaUrl(r.requestId, 'video')"
            ></video>
            <p v-if="r.reviewNote" class="small muted">Note : {{ r.reviewNote }}</p>
            <div v-if="r.status === 'Submitted'" class="g-actions">
              <button class="g-btn ok" type="button" :disabled="busy" @click="acceptVerification(r)">
                Accepter et lever la suspension
              </button>
              <button class="g-btn warn" type="button" :disabled="busy" @click="refuseVerification(r)">Refuser</button>
            </div>
          </div>
        </template>

        <!-- Signalements -->
        <template v-else-if="tab === 'reports'">
          <div class="card-head">
            <h2>Signalements</h2>
            <label class="small"><input v-model="pendingReportsOnly" type="checkbox" @change="loadReports" /> À traiter seulement</label>
          </div>
          <p v-if="!reports.length" class="muted pad">Aucun signalement.</p>
          <div v-for="r in reports" :key="r.reportId" class="g-item">
            <div class="g-item-head">
              <span>
                <a href="#" @click.prevent="selectUser(r.reporter.userId)">{{ r.reporter.displayName }}</a>
                signale
                <a href="#" @click.prevent="selectUser(r.reported.userId)"><strong>{{ r.reported.displayName }}</strong></a>
                <span v-if="r.reported.isBanned" class="g-badge banned">banni</span>
              </span>
              <span class="g-badge" :class="r.reviewedAt ? 'v-accepted' : 'v-submitted'">
                {{ r.reviewedAt ? "Traité" : "À traiter" }}
              </span>
            </div>
            <p class="small">{{ reportReasonLabel(r.reason) }} · {{ formatDateTime(r.createdAt) }}</p>
            <p v-if="r.details" class="small">« {{ r.details }} »</p>
            <p v-if="r.reviewNote" class="small muted">Note : {{ r.reviewNote }}</p>
            <div class="g-actions">
              <button v-if="r.matchId" class="g-btn" type="button" @click="showConversation(r)">Voir la conversation</button>
              <button class="g-btn" type="button" @click="selectUser(r.reported.userId)">Ouvrir la fiche</button>
              <button v-if="!r.reviewedAt" class="g-btn ok" type="button" :disabled="busy" @click="resolveReport(r)">
                Marquer comme traité
              </button>
            </div>
          </div>
        </template>

        <!-- Demandes de nouvelles propositions -->
        <template v-else-if="tab === 'unlocks'">
          <div class="card-head">
            <h2>Demandes de nouvelles propositions</h2>
            <label class="small"><input v-model="pendingUnlocksOnly" type="checkbox" @change="loadUnlocks" /> À traiter seulement</label>
          </div>
          <p class="muted pad small">
            Une personne dont le cycle est terminé demande de nouveaux profils. En valider une ouvre son prochain cycle.
          </p>
          <p v-if="!unlocks.length" class="muted pad">Aucune demande.</p>
          <div v-for="r in unlocks" :key="r.requestId" class="g-item">
            <div class="g-item-head">
              <a href="#" @click.prevent="selectUser(r.user.userId)"><strong>{{ r.user.displayName }}</strong></a>
              <span class="g-badge" :class="unlockBadge(r)">{{ unlockLabel(r) }}</span>
            </div>
            <p class="small muted">
              Demandé le {{ formatDateTime(r.createdAt) }}
              <template v-if="r.cycleNumber"> · cycle n°{{ r.cycleNumber }} terminé le {{ formatDateTime(r.cycleEndedAt) }}</template>
            </p>
            <p class="small">
              {{ r.proposalsCount }} proposition(s), {{ r.chosenCount }} choix, {{ r.hadMatch ? "avec" : "sans" }} match
            </p>
            <p v-if="r.message" class="small">« {{ r.message }} »</p>
            <p v-if="r.reviewNote" class="small muted">Note : {{ r.reviewNote }}</p>
            <div v-if="r.status === 'pending'" class="g-actions">
              <button class="g-btn ok" type="button" :disabled="busy" @click="approveUnlock(r)">Valider (ouvre un nouveau cycle)</button>
              <button class="g-btn warn" type="button" :disabled="busy" @click="rejectUnlock(r)">Refuser</button>
            </div>
          </div>
        </template>

        <!-- Messages -->
        <template v-else-if="tab === 'messages'">
          <div class="card-head">
            <h2>Messages</h2>
            <span class="small muted">{{ messagesScope }}</span>
          </div>
          <div class="g-actions pad">
            <button class="g-btn" type="button" @click="loadMessages({})">Derniers messages (tous)</button>
            <button v-if="messageFilter.userId || messageFilter.matchId" class="g-btn" type="button" @click="loadMessages({})">
              Retirer le filtre
            </button>
          </div>
          <p v-if="!messages.length" class="muted pad">Aucun message.</p>
          <ul v-else class="g-messages">
            <li v-for="m in messages" :key="m.id">
              <span class="small muted">{{ formatDateTime(m.sentAt) }}</span>
              <a href="#" @click.prevent="selectUser(m.sender.userId)"><strong>{{ m.sender.displayName }}</strong></a>
              <button class="g-link" type="button" title="Voir toute la conversation" @click="loadMessages({ matchId: m.matchId })">↗</button>
              <p>{{ m.content }}</p>
            </li>
          </ul>
        </template>

        <!-- Membres -->
        <template v-else>
          <div class="card-head">
            <h2>Membres</h2>
            <div class="g-filters">
              <select v-model="memberStatus" @change="loadMembers">
                <option value="">Tous</option>
                <option value="approved">Actifs</option>
                <option value="pending">À valider</option>
                <option value="suspended">Suspendus</option>
                <option value="rejected">Refusés</option>
                <option value="banned">Bannis</option>
              </select>
              <input v-model="memberSearch" type="search" placeholder="Nom ou téléphone" @keyup.enter="loadMembers" />
            </div>
          </div>
          <p v-if="!members.length" class="muted pad">Aucun membre.</p>
          <table v-else class="g-table">
            <thead><tr><th>Nom</th><th>Téléphone</th><th>État</th><th>Signalements</th><th>Inscrite</th></tr></thead>
            <tbody>
              <tr v-for="u in members" :key="u.userId" :class="{ selected: selectedId === u.userId }" @click="selectUser(u.userId)">
                <td>{{ u.displayName }}</td>
                <td>{{ u.phone }}</td>
                <td><span class="g-badge" :class="accountState(u).key">{{ accountState(u).label }}</span></td>
                <td>{{ u.reportsReceived }}<span v-if="u.reportsPending" class="g-count">{{ u.reportsPending }}</span></td>
                <td>{{ formatDate(u.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </section>

      <!-- Fiche utilisatrice -->
      <aside v-if="detail" class="card g-detail">
        <div class="card-head">
          <h2>{{ detail.summary.displayName }}</h2>
          <button class="g-link" type="button" @click="closeUser">Fermer</button>
        </div>
        <div class="g-detail-body">
          <p>
            <span class="g-badge" :class="accountState(detail.summary).key">{{ accountState(detail.summary).label }}</span>
            <span v-if="detail.age" class="small"> · {{ detail.age }} ans</span>
          </p>
          <p class="small muted">{{ detail.summary.phone }} · inscrite le {{ formatDate(detail.summary.createdAt) }}</p>
          <p v-if="detail.location" class="small">{{ detail.location }}</p>
          <p v-if="detail.genderIdentity || detail.pronouns" class="small">
            {{ detail.genderIdentity }} <span v-if="detail.pronouns">({{ detail.pronouns }})</span>
            <template v-if="detail.lookingFor"> · cherche : {{ detail.lookingFor }}</template>
          </p>
          <p v-if="detail.bio" class="small">« {{ detail.bio }} »</p>

          <div v-if="detail.photos.length" class="g-photos">
            <a v-for="p in detail.photos" :key="p.photoId" :href="gaiaPhotoUrl(p.fileName)" target="_blank" rel="noopener">
              <img :src="gaiaPhotoUrl(p.fileName)" :alt="p.isMain ? 'Photo principale' : 'Photo'" loading="lazy" />
            </a>
          </div>
          <p v-else class="small muted">Aucune photo ajoutée.</p>

          <div v-if="detail.summary.hasVoice" class="g-voice">
            <p class="small"><strong>Vocal d'inscription</strong>
              <template v-if="detail.summary.voiceSubmittedAt"> · {{ formatDateTime(detail.summary.voiceSubmittedAt) }}</template>
            </p>
            <audio controls preload="none" :src="gaiaVoiceUrl(detail.summary.userId)"></audio>
          </div>
          <p v-else class="small muted">Pas de vocal envoyé.</p>

          <p v-if="detail.rejectionReason" class="small">Motif du refus : {{ detail.rejectionReason }}</p>
          <p v-if="detail.banReason" class="small">Motif du bannissement : {{ detail.banReason }}</p>
          <p v-if="detail.summary.suspensionReason" class="small">Motif de la suspension : {{ detail.summary.suspensionReason }}</p>
          <p v-if="detail.summary.reportsReceived" class="small">
            {{ detail.summary.reportsReceived }} signalement(s) reçu(s)
            <button class="g-link" type="button" @click="loadReportsFor(detail.summary.userId)">voir</button>
          </p>

          <div v-if="detail.verificationRequests.length" class="g-history">
            <p class="small"><strong>Vérifications</strong></p>
            <p v-for="r in detail.verificationRequests" :key="r.requestId" class="small muted">
              {{ formatDateTime(r.createdAt) }} · {{ requestedMediaLabel(r) }} · {{ verificationLabel(r.status) }}
            </p>
          </div>

          <div class="g-actions">
            <button class="g-btn" type="button" @click="loadMessages({ userId: detail.summary.userId })">Ses messages</button>
          </div>

          <!-- Décisions -->
          <div class="g-decisions">
            <template v-if="detail.summary.isBanned">
              <button class="g-btn ok" type="button" :disabled="busy" @click="unban">Lever le bannissement</button>
            </template>
            <template v-else>
              <button
                v-if="detail.summary.approvalStatus !== 'Approved'"
                class="g-btn ok"
                type="button"
                :disabled="busy || !detail.summary.hasVoice"
                :title="detail.summary.hasVoice ? '' : 'Aucun vocal à écouter'"
                @click="approve"
              >
                Valider
              </button>
              <button
                v-if="detail.summary.approvalStatus === 'Pending'"
                class="g-btn warn"
                type="button"
                :disabled="busy"
                @click="reject"
              >
                Refuser
              </button>
              <button v-if="detail.summary.isSuspended" class="g-btn" type="button" :disabled="busy" @click="unsuspend">
                Lever la suspension
              </button>
              <button class="g-btn warn" type="button" :disabled="busy" @click="showSuspend = !showSuspend">
                {{ detail.summary.isSuspended ? "Nouvelle demande de vérification" : "Suspendre (soupçon)" }}
              </button>
              <button class="g-btn danger" type="button" :disabled="busy" @click="ban">Bannir</button>
            </template>
          </div>

          <form v-if="showSuspend" class="g-suspend" @submit.prevent="suspend">
            <p class="small">
              Le compte est suspendu immédiatement. Tu peux demander à l'utilisatrice un audio et/ou une vidéo,
              qu'elle enregistrera depuis l'app ; tu les examines ensuite dans l'onglet « Vérifications ».
            </p>
            <label class="small">Motif (affiché à l'utilisatrice)
              <input v-model="suspendForm.reason" type="text" maxlength="300" />
            </label>
            <label class="small"><input v-model="suspendForm.requestAudio" type="checkbox" /> Demander un audio</label>
            <label class="small"><input v-model="suspendForm.requestVideo" type="checkbox" /> Demander une vidéo</label>
            <label v-if="suspendForm.requestAudio || suspendForm.requestVideo" class="small">
              Consigne (ex : « dis ton prénom et la date du jour »)
              <input v-model="suspendForm.prompt" type="text" maxlength="500" />
            </label>
            <button class="g-btn warn" type="submit" :disabled="busy">Suspendre le compte</button>
          </form>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import {
  acceptGaiaVerificationApi,
  approveGaiaUnlockApi,
  approveGaiaUserApi,
  banGaiaUserApi,
  gaiaPhotoUrl,
  gaiaVerificationMediaUrl,
  gaiaVoiceUrl,
  getGaiaUserApi,
  listGaiaMessagesApi,
  listGaiaReportsApi,
  listGaiaUnlockRequestsApi,
  listGaiaUsersApi,
  listGaiaVerificationRequestsApi,
  refuseGaiaVerificationApi,
  rejectGaiaUnlockApi,
  rejectGaiaUserApi,
  resolveGaiaReportApi,
  suspendGaiaUserApi,
  unbanGaiaUserApi,
  unsuspendGaiaUserApi,
} from "@/services/gaiaModeration.api";
import { formatDate, formatDateTime } from "@/utils/format.utils";
import { accountState, reportReasonLabel, requestedMediaLabel, verificationLabel } from "@/utils/gaia.utils";

const tab = ref("review");
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const notice = ref("");

const pendingUsers = ref([]);
const verifications = ref([]);
const reports = ref([]);
const pendingReportsOnly = ref(true);
const unlocks = ref([]);
const pendingUnlocksOnly = ref(true);
const messages = ref([]);
const messageFilter = reactive({ userId: null, matchId: null });
const members = ref([]);
const memberStatus = ref("");
const memberSearch = ref("");

const selectedId = ref(null);
const detail = ref(null);
const showSuspend = ref(false);
const suspendForm = reactive({ reason: "", requestAudio: true, requestVideo: false, prompt: "" });

const toSubmit = computed(() => verifications.value.filter((r) => r.status === "Submitted").length);
const pendingReports = computed(() => reports.value.filter((r) => !r.reviewedAt).length);
const pendingUnlocks = computed(() => unlocks.value.filter((r) => r.status === "pending").length);

const tabs = computed(() => [
  { id: "review", label: "À valider", count: pendingUsers.value.length },
  { id: "verifications", label: "Vérifications", count: toSubmit.value },
  { id: "reports", label: "Signalements", count: pendingReports.value },
  { id: "unlocks", label: "Déblocages", count: pendingUnlocks.value },
  { id: "messages", label: "Messages", count: 0 },
  { id: "members", label: "Membres", count: 0 },
]);

const messagesScope = computed(() => {
  if (messageFilter.matchId) return "Conversation sélectionnée";
  if (messageFilter.userId) return "Messages de cette utilisatrice";
  return "Derniers messages de l'application";
});

const messageOf = (e) => e?.response?.data?.detail || e?.response?.data?.title || e?.message || "Erreur inconnue";

const run = async (fn, successMessage) => {
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await fn();
    if (successMessage) notice.value = successMessage;
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    busy.value = false;
  }
};

const loadPending = async () => (pendingUsers.value = await listGaiaUsersApi({ status: "pending" }));
const loadVerifications = async () => (verifications.value = await listGaiaVerificationRequestsApi());
const loadReports = async () => (reports.value = await listGaiaReportsApi(pendingReportsOnly.value));
const loadUnlocks = async () =>
  (unlocks.value = await listGaiaUnlockRequestsApi(pendingUnlocksOnly.value ? "pending" : undefined));
const loadMembers = async () => {
  loading.value = true;
  try {
    members.value = await listGaiaUsersApi({ status: memberStatus.value || undefined, search: memberSearch.value || undefined });
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
};

const loadMessages = async ({ userId = null, matchId = null }) => {
  messageFilter.userId = userId;
  messageFilter.matchId = matchId;
  tab.value = "messages";
  loading.value = true;
  try {
    messages.value = await listGaiaMessagesApi({ userId: userId || undefined, matchId: matchId || undefined, take: 300 });
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
};

const loadAll = async () => {
  loading.value = true;
  error.value = "";
  try {
    await Promise.all([loadPending(), loadVerifications(), loadReports(), loadUnlocks()]);
    if (tab.value === "members") await loadMembers();
    if (selectedId.value) await refreshDetail();
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
};

const openTab = async (id) => {
  tab.value = id;
  if (id === "members") await loadMembers();
  else if (id === "messages") await loadMessages({});
};

const refreshDetail = async () => {
  if (selectedId.value) detail.value = await getGaiaUserApi(selectedId.value);
};

const selectUser = async (userId) => {
  selectedId.value = userId;
  showSuspend.value = false;
  suspendForm.reason = "";
  suspendForm.prompt = "";
  try {
    await refreshDetail();
  } catch (e) {
    error.value = messageOf(e);
  }
};

const closeUser = () => {
  selectedId.value = null;
  detail.value = null;
};

const afterDecision = async () => {
  await Promise.all([loadPending(), loadVerifications(), loadReports()]);
  if (tab.value === "members") await loadMembers();
  await refreshDetail();
};

const ask = (message) => window.prompt(message, "");

const unlockLabel = (r) => {
  if (r.status === "pending") return "À traiter";
  if (r.status === "approved") return r.consumed ? "Validée (cycle ouvert)" : "Validée (en attente de profils)";
  return "Refusée";
};
const unlockBadge = (r) => (r.status === "pending" ? "v-submitted" : r.status === "approved" ? "v-accepted" : "v-refused");

const approveUnlock = (r) => {
  if (!window.confirm(`Ouvrir un nouveau cycle de propositions pour ${r.user.displayName} ?`)) return;
  run(async () => {
    await approveGaiaUnlockApi(r.requestId, "");
    await loadUnlocks();
  }, "Demande validée.");
};

const rejectUnlock = (r) => {
  const note = ask(`Refuser la demande de ${r.user.displayName} ? Motif (interne) :`);
  if (note === null) return;
  run(async () => {
    await rejectGaiaUnlockApi(r.requestId, note);
    await loadUnlocks();
  }, "Demande refusée.");
};

const approve = () => {
  if (!window.confirm(`Valider ${detail.value.summary.displayName} après écoute du vocal ?`)) return;
  run(async () => {
    await approveGaiaUserApi(selectedId.value);
    await afterDecision();
  }, "Utilisatrice validée.");
};

const reject = () => {
  const reason = ask("Motif du refus (visible par l'utilisatrice) :");
  if (reason === null) return;
  run(async () => {
    await rejectGaiaUserApi(selectedId.value, reason);
    await afterDecision();
  }, "Utilisatrice refusée.");
};

const ban = () => {
  const reason = ask(`Bannir ${detail.value.summary.displayName} ? Motif (interne) :`);
  if (reason === null) return;
  run(async () => {
    await banGaiaUserApi(selectedId.value, reason);
    await afterDecision();
  }, "Compte banni.");
};

const unban = () =>
  run(async () => {
    await unbanGaiaUserApi(selectedId.value);
    await afterDecision();
  }, "Bannissement levé.");

const suspend = () =>
  run(async () => {
    await suspendGaiaUserApi(selectedId.value, {
      reason: suspendForm.reason,
      requestAudio: suspendForm.requestAudio,
      requestVideo: suspendForm.requestVideo,
      prompt: suspendForm.prompt,
    });
    showSuspend.value = false;
    await afterDecision();
  }, suspendForm.requestAudio || suspendForm.requestVideo
    ? "Compte suspendu : la demande de vérification est visible dans l'app."
    : "Compte suspendu.");

const unsuspend = () =>
  run(async () => {
    await unsuspendGaiaUserApi(selectedId.value);
    await afterDecision();
  }, "Suspension levée.");

const acceptVerification = (r) => {
  const note = ask("Note interne (facultatif) :");
  if (note === null) return;
  run(async () => {
    await acceptGaiaVerificationApi(r.requestId, note);
    await afterDecision();
  }, "Vérification acceptée, suspension levée.");
};

const refuseVerification = (r) => {
  const note = ask("Motif du refus (le compte reste suspendu) :");
  if (note === null) return;
  run(async () => {
    await refuseGaiaVerificationApi(r.requestId, note);
    await afterDecision();
  }, "Vérification refusée : le compte reste suspendu.");
};

const resolveReport = (r) => {
  const note = ask("Note de traitement (facultatif) :");
  if (note === null) return;
  run(async () => {
    await resolveGaiaReportApi(r.reportId, note);
    await loadReports();
  }, "Signalement marqué comme traité.");
};

const showConversation = (r) => loadMessages({ matchId: r.matchId });

const loadReportsFor = async (userId) => {
  tab.value = "reports";
  pendingReportsOnly.value = false;
  loading.value = true;
  try {
    const all = await listGaiaReportsApi(false);
    reports.value = all.filter((r) => r.reported.userId === userId);
  } catch (e) {
    error.value = messageOf(e);
  } finally {
    loading.value = false;
  }
};

onMounted(loadAll);
</script>

<style scoped>
.g-notice {
  background: var(--success-soft);
  border: 1px solid var(--success);
  color: var(--success);
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 12px;
  font-size: 0.85rem;
}

.g-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.g-tab,
.g-btn {
  font: inherit;
  font-size: 0.85rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  border-radius: 10px;
  padding: 7px 12px;
  cursor: pointer;
}

.g-tab.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent);
}

.g-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.g-btn.ok { border-color: var(--success); color: var(--success); }
.g-btn.warn { border-color: var(--warning); color: var(--warning); }
.g-btn.danger { border-color: var(--critical); color: var(--critical); }

.g-count {
  margin-left: 6px;
  background: var(--critical);
  color: #fff;
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 0.72rem;
}

.g-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}

@media (min-width: 1100px) {
  .g-layout:has(.g-detail) {
    grid-template-columns: minmax(0, 1fr) 380px;
  }
}

.pad { padding: 14px 18px; }
.small { font-size: 0.82rem; margin: 4px 0; }

.g-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.g-table th,
.g-table td {
  text-align: left;
  padding: 9px 14px;
  border-bottom: 1px solid var(--border);
}

.g-table tbody tr { cursor: pointer; }
.g-table tbody tr:hover,
.g-table tbody tr.selected { background: var(--surface-alt); }

.g-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 1px 9px;
  font-size: 0.74rem;
  background: var(--surface-alt);
  color: var(--ink-muted);
}

.g-badge.banned, .g-badge.v-refused { background: var(--critical-soft); color: var(--critical); }
.g-badge.suspended, .g-badge.pending, .g-badge.v-submitted, .g-badge.v-open { background: var(--warning-soft); color: var(--warning); }
.g-badge.approved, .g-badge.v-accepted { background: var(--success-soft); color: var(--success); }

.g-item {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.g-item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.g-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.g-link {
  font: inherit;
  font-size: 0.8rem;
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  text-decoration: underline;
  padding: 0 4px;
}

.g-video { display: block; width: 100%; max-width: 420px; border-radius: 10px; margin-top: 8px; }
audio { width: 100%; max-width: 420px; margin-top: 6px; }

.g-messages { list-style: none; margin: 0; padding: 4px 18px 14px; }
.g-messages li { padding: 8px 0; border-bottom: 1px solid var(--border); }
.g-messages li p { margin: 4px 0 0; font-size: 0.88rem; white-space: pre-wrap; }

.g-filters { display: flex; gap: 8px; }
.g-filters select, .g-filters input, .g-suspend input[type="text"] {
  font: inherit;
  font-size: 0.82rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink);
  border-radius: 8px;
  padding: 6px 9px;
}

.g-detail { position: sticky; top: 16px; }
.g-detail-body { padding: 14px 18px; }

.g-photos {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 10px 0;
}

.g-photos img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.g-voice { margin: 12px 0; }
.g-history { margin-top: 10px; }
.g-decisions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); }

.g-suspend {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--warning);
  background: var(--warning-soft);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.g-suspend label { display: flex; flex-direction: column; gap: 4px; }
.g-suspend label:has(input[type="checkbox"]) { flex-direction: row; align-items: center; gap: 6px; }
</style>
