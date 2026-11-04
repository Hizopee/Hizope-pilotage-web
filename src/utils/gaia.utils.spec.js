import { describe, expect, it } from "vitest";
import { accountState, approvalLabel, reportReasonLabel, requestedMediaLabel, verificationLabel } from "./gaia.utils";

describe("gaia.utils", () => {
  it("donne la priorité au bannissement, puis à la suspension, puis à la validation", () => {
    expect(accountState({ isBanned: true, isSuspended: true, approvalStatus: "Approved" }).key).toBe("banned");
    expect(accountState({ isBanned: false, isSuspended: true, approvalStatus: "Pending" }).key).toBe("suspended");
    expect(accountState({ isBanned: false, isSuspended: false, approvalStatus: "Pending" }).key).toBe("pending");
    expect(accountState({ isBanned: false, isSuspended: false, approvalStatus: "Rejected" }).key).toBe("rejected");
    expect(accountState({ isBanned: false, isSuspended: false, approvalStatus: "Approved" }).key).toBe("approved");
  });

  it("traduit les motifs, statuts et médias demandés", () => {
    expect(reportReasonLabel("FakeProfile")).toBe("Faux profil");
    expect(approvalLabel("Pending")).toBe("En attente");
    expect(verificationLabel("Submitted")).toBe("À examiner");
    expect(requestedMediaLabel({ requestedAudio: true, requestedVideo: true })).toBe("audio + vidéo");
    expect(requestedMediaLabel({ requestedAudio: false, requestedVideo: true })).toBe("vidéo");
    expect(requestedMediaLabel({ requestedAudio: true, requestedVideo: false })).toBe("audio");
  });

  it("garde la valeur brute pour un libellé inconnu", () => {
    expect(reportReasonLabel("Nouveau")).toBe("Nouveau");
  });
});
