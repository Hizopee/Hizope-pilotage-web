// Libellés français des valeurs renvoyées par la modération Gaia.

const APPROVAL = { Pending: "En attente", Approved: "Validée", Rejected: "Refusée" };
const REPORT_REASON = {
  NotQueerOrMale: "Profil non conforme (homme / hors communauté)",
  Harassment: "Harcèlement",
  FakeProfile: "Faux profil",
  InappropriateContent: "Contenu inapproprié",
  Spam: "Spam",
  Other: "Autre",
};
const VERIFICATION = {
  Open: "En attente de l'envoi",
  Submitted: "À examiner",
  Accepted: "Acceptée",
  Refused: "Refusée",
  Cancelled: "Annulée",
};

export const approvalLabel = (status) => APPROVAL[status] || status;
export const reportReasonLabel = (reason) => REPORT_REASON[reason] || reason;
export const verificationLabel = (status) => VERIFICATION[status] || status;

// Un seul état « principal » par compte, du plus grave au moins grave : banni > suspendu > validation.
export const accountState = (user) => {
  if (user.isBanned) return { key: "banned", label: "Banni" };
  if (user.isSuspended) return { key: "suspended", label: "Suspendu" };
  if (user.approvalStatus === "Pending") return { key: "pending", label: "À valider" };
  if (user.approvalStatus === "Rejected") return { key: "rejected", label: "Refusé" };
  return { key: "approved", label: "Actif" };
};

export const requestedMediaLabel = (request) => {
  if (request.requestedAudio && request.requestedVideo) return "audio + vidéo";
  if (request.requestedVideo) return "vidéo";
  if (request.requestedAudio) return "audio";
  return "—";
};
