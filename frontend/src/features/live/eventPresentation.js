const minuteLabel = (event = {}) =>
  event.minute ? `${event.minute}${event.stoppageMinute ? `+${event.stoppageMinute}` : ""}'` : "";

const actorName = (event = {}) =>
  event.playerSnapshot?.name ||
  event.temporaryOpponentPlayerName ||
  event.ownGoalBy?.playerSnapshot?.name ||
  event.ownGoalBy?.temporaryOpponentPlayerName ||
  "Match event";

const scoreLine = (state = {}) => {
  if (typeof state.teamScore !== "number" || typeof state.opponentScore !== "number") return "";
  return `${state.team?.name || "Team"} ${state.teamScore}-${state.opponentScore} ${state.opponent?.name || "Opponent"}`;
};

export const presentationDuration = (presentation) =>
  ["goal", "penalty_scored"].includes(presentation?.tone) ? 4500 : 3000;

export const eventPresentation = ({ kind, event, state } = {}) => {
  if (kind === "undo") {
    return {
      tone: "correction",
      label: "Event corrected",
      title: "EVENT CORRECTED",
      lines: [actorName(event), event?.undoReason || "Latest event was undone"].filter(Boolean),
      duration: 3000,
    };
  }
  if (kind === "transition") {
    const status = state?.status;
    const period = state?.currentPeriod;
    const title = status === "half_time" ? "HALF-TIME" : status === "completed" ? "FULL-TIME" : status === "live" && period === "second_half" ? "SECOND HALF" : "MATCH START";
    return { tone: "transition", label: title, title, lines: [scoreLine(state)].filter(Boolean), duration: 3000 };
  }
  const type = event?.type;
  const minute = minuteLabel(event);
  if (type === "substitution") {
    return {
      tone: "substitution",
      label: "Substitution",
      title: "SUBSTITUTION",
      lines: [`${event.playerInSnapshot?.name || "Player"} IN`, `${event.playerOutSnapshot?.name || "Player"} OUT`, minute].filter(Boolean),
      duration: 3000,
    };
  }
  if (type === "yellow_card" || type === "red_card") {
    const title = type === "yellow_card" ? "YELLOW CARD" : "RED CARD";
    return { tone: type, label: title, title, lines: [`${actorName(event)}${minute ? ` - ${minute}` : ""}`], duration: 3000 };
  }
  if (type === "penalty_missed" || type === "penalty_saved") {
    const title = type === "penalty_saved" ? "PENALTY SAVED" : "PENALTY MISSED";
    return { tone: type, label: title, title, lines: [actorName(event), minute].filter(Boolean), duration: 3000 };
  }
  if (type === "own_goal") {
    return { tone: "own_goal", label: "Own goal", title: "OWN GOAL", lines: [actorName(event), scoreLine(state), minute].filter(Boolean), duration: 4500 };
  }
  if (type === "goal" || type === "penalty_scored") {
    const assist = event?.assistPlayerSnapshot?.name ? `Assist: ${event.assistPlayerSnapshot.name}` : "";
    const title = type === "penalty_scored" ? "PENALTY SCORED" : "GOAL!";
    return { tone: type, label: title, title, lines: [actorName(event), scoreLine(state), assist, minute].filter(Boolean), duration: 4500 };
  }
  return { tone: "event", label: "Match event", title: "MATCH EVENT", lines: [actorName(event), minute].filter(Boolean), duration: 3000 };
};
