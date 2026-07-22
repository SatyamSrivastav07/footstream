let ioInstance = null;

export const setRealtimeServer = (io) => { ioInstance = io; };
export const emitToMatch = (matchId, eventName, payload) => {
  if (ioInstance) ioInstance.to(`match:${matchId}`).emit(eventName, payload);
};

export const emitToTeam = (teamId, eventName, payload) => {
  if (ioInstance) ioInstance.to(`team:${teamId}`).emit(eventName, payload);
};

export const emitToTeamAdminsCommunity = (eventName, payload) => {
  if (ioInstance) ioInstance.to('team-admins:community').emit(eventName, payload);
};
