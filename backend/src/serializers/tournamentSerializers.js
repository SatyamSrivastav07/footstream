const asObject = (document) => {
  if (!document) return null;
  if (typeof document.toObject === 'function') return document.toObject();
  return { ...document };
};

const idOf = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return String(value._id);
  return String(value);
};

const publicImage = (image) => {
  if (!image) return null;
  if (typeof image === 'string') return image || null;
  return image.imageUrl ? { imageUrl: image.imageUrl } : null;
};

const removeEmpty = (payload) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

export const serializeTournamentPublic = (tournamentDocument) => {
  const tournament = asObject(tournamentDocument);
  if (!tournament) return null;
  return removeEmpty({
    id: idOf(tournament._id),
    name: tournament.name,
    shortName: tournament.shortName,
    slug: tournament.slug,
    seriesName: tournament.seriesName,
    seriesSlug: tournament.seriesSlug,
    seasonLabel: tournament.seasonLabel,
    editionNumber: tournament.editionNumber,
    description: tournament.description,
    scope: tournament.scope,
    competitionFormat: tournament.competitionFormat,
    matchFormat: tournament.matchFormat,
    logo: publicImage(tournament.logo),
    coverImage: publicImage(tournament.coverImage),
    primaryColor: tournament.primaryColor,
    secondaryColor: tournament.secondaryColor,
    country: tournament.country,
    state: tournament.state,
    city: tournament.city,
    primaryVenue: tournament.primaryVenue,
    additionalVenues: tournament.additionalVenues,
    registrationOpen: tournament.registrationOpen,
    registrationClose: tournament.registrationClose,
    squadLock: tournament.squadLock,
    fixturePublish: tournament.fixturePublish,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    lifecycleStatus: tournament.lifecycleStatus,
    visibility: tournament.visibility,
    isPublished: tournament.isPublished,
    playersOnField: tournament.playersOnField,
    minimumSquad: tournament.minimumSquad,
    maximumSquad: tournament.maximumSquad,
    maximumMatchdaySquad: tournament.maximumMatchdaySquad,
    maximumSubstitutes: tournament.maximumSubstitutes,
    rollingSubs: tournament.rollingSubs,
    minimumTeams: tournament.minimumTeams,
    maximumTeams: tournament.maximumTeams,
    plannedTeams: tournament.plannedTeams,
    winPoints: tournament.winPoints,
    drawPoints: tournament.drawPoints,
    lossPoints: tournament.lossPoints,
    galleryEnabled: tournament.galleryEnabled,
    shareEnabled: tournament.shareEnabled,
    qrEnabled: tournament.qrEnabled,
  });
};

export const serializeTournamentHost = (tournamentDocument) => {
  const tournament = asObject(tournamentDocument);
  if (!tournament) return null;
  return removeEmpty({
    ...serializeTournamentPublic(tournament),
    approvalStatus: tournament.approvalStatus,
    submittedAt: tournament.submittedAt,
    reviewedAt: tournament.reviewedAt,
    approvedAt: tournament.approvedAt,
    rejectedAt: tournament.rejectedAt,
    rejectionReason: tournament.rejectionReason,
    changeRequest: tournament.changeRequest,
    publishedAt: tournament.publishedAt,
    isArchived: tournament.isArchived,
    archivedAt: tournament.archivedAt,
    numberOfGroups: tournament.numberOfGroups,
    teamsPerGroup: tournament.teamsPerGroup,
    qualifiersPerGroup: tournament.qualifiersPerGroup,
    groupMode: tournament.groupMode,
    matchMinutes: tournament.matchMinutes,
    halfMinutes: tournament.halfMinutes,
    extraTime: tournament.extraTime,
    penalties: tournament.penalties,
    walkoverEnabled: tournament.walkoverEnabled,
    walkoverWinnerGoals: tournament.walkoverWinnerGoals,
    walkoverLoserGoals: tournament.walkoverLoserGoals,
    walkoverPoints: tournament.walkoverPoints,
    awardsEnabled: tournament.awardsEnabled,
    tiebreakOrder: tournament.tiebreakOrder,
    officialsEnabled: tournament.officialsEnabled,
  });
};

export const serializeTournamentAdmin = (tournamentDocument) => {
  const tournament = asObject(tournamentDocument);
  if (!tournament) return null;
  return removeEmpty({
    ...serializeTournamentHost(tournament),
    hostTeam: idOf(tournament.hostTeam),
  });
};

export const serializeTournamentParticipantPublic = (participantDocument) => {
  const participant = asObject(participantDocument);
  if (!participant) return null;
  return removeEmpty({
    id: idOf(participant._id),
    participantType: participant.participantType,
    displayName: participant.displayName,
    shortName: participant.shortName,
    slug: participant.slug,
    logo: publicImage(participant.logo),
    primaryColor: participant.primaryColor,
    secondaryColor: participant.secondaryColor,
    captainName: participant.captainName,
    managerName: participant.managerName,
    coachName: participant.coachName,
    seed: participant.seed,
    status: participant.status,
  });
};

export const serializeTournamentSquadPlayerPublic = (playerDocument) => {
  const player = asObject(playerDocument);
  if (!player) return null;
  return removeEmpty({
    id: idOf(player._id),
    sourceType: player.sourceType,
    name: player.name,
    position: player.position,
    jersey: player.jersey,
    photo: publicImage(player.photo),
    captain: player.captain,
    viceCaptain: player.viceCaptain,
    goalkeeper: player.goalkeeper,
  });
};

export const serializeTournamentSquadPublic = (squadDocument, players = [], participantDocument = null) => {
  const squad = asObject(squadDocument);
  if (!squad) return null;
  const captainId = idOf(squad.captain);
  const viceCaptainId = idOf(squad.viceCaptain);
  const safePlayers = players.map(serializeTournamentSquadPlayerPublic).filter(Boolean);
  return removeEmpty({
    id: idOf(squad._id),
    participant: participantDocument ? serializeTournamentParticipantPublic(participantDocument) : idOf(squad.participant),
    status: squad.status,
    playerCount: safePlayers.length,
    captain: safePlayers.find((player) => player.id === captainId || player.captain) || null,
    viceCaptain: safePlayers.find((player) => player.id === viceCaptainId || player.viceCaptain) || null,
    players: safePlayers,
  });
};

export const serializeTournamentSquadHost = (squadDocument, players = [], participantDocument = null) => {
  const squad = asObject(squadDocument);
  if (!squad) return null;
  return removeEmpty({
    ...serializeTournamentSquadPublic(squad, players, participantDocument),
    registeredTeam: idOf(squad.registeredTeam),
    submittedAt: squad.submittedAt,
    approvedAt: squad.approvedAt,
    lockedAt: squad.lockedAt,
    unlockedAt: squad.unlockedAt,
    rejectionReason: squad.rejectionReason,
  });
};

export const serializeTournamentSquadHistory = (historyDocument) => {
  const item = asObject(historyDocument);
  if (!item) return null;
  return removeEmpty({
    id: idOf(item._id),
    action: item.action,
    actorRole: item.actorRole,
    safeMessage: item.safeMessage,
    createdAt: item.createdAt,
  });
};

const serializeLineupPlayer = (playerDocument) => {
  const player = asObject(playerDocument);
  if (!player) return null;
  return removeEmpty({
    id: idOf(player.squadPlayer || player._id),
    name: player.name,
    position: player.position,
    jersey: player.jersey,
    photoUrl: player.photoUrl,
    sourceType: player.sourceType,
    slotId: player.slotId,
    lineIndex: player.lineIndex,
    positionIndex: player.positionIndex,
    roleLabel: player.roleLabel,
    x: player.x,
    y: player.y,
  });
};

const serializeLineupSide = (side = {}) => removeEmpty({
  formation: side.formation,
  customFormation: side.customFormation,
  startingPlayers: (side.startingPlayers || []).map(serializeLineupPlayer).filter(Boolean),
  substitutes: (side.substitutes || []).map(serializeLineupPlayer).filter(Boolean),
  captain: serializeLineupPlayer(side.captain),
  goalkeeper: serializeLineupPlayer(side.goalkeeper),
  submittedAt: side.submittedAt,
  lockedAt: side.lockedAt,
});

export const serializeTournamentLineupHost = (lineupDocument, participantsById = {}) => {
  const lineup = asObject(lineupDocument);
  if (!lineup) return null;
  const homeId = idOf(lineup.homeParticipant);
  const awayId = idOf(lineup.awayParticipant);
  return removeEmpty({
    id: idOf(lineup._id),
    tournament: idOf(lineup.tournament),
    provisionalFixtureKey: lineup.provisionalFixtureKey,
    status: lineup.status,
    matchCreated: lineup.matchCreated,
    homeParticipant: participantsById[homeId] || homeId,
    awayParticipant: participantsById[awayId] || awayId,
    home: serializeLineupSide(lineup.home || {}),
    away: serializeLineupSide(lineup.away || {}),
    createdAt: lineup.createdAt,
    updatedAt: lineup.updatedAt,
  });
};

export const serializeTournamentLineupHistory = (historyDocument) => {
  const item = asObject(historyDocument);
  if (!item) return null;
  return removeEmpty({
    id: idOf(item._id),
    action: item.action,
    actorRole: item.actorRole,
    safeMessage: item.safeMessage,
    createdAt: item.createdAt,
  });
};
