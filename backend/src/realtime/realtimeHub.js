let ioInstance = null;

export const setRealtimeServer = (io) => { ioInstance = io; };
export const emitToMatch = (matchId, eventName, payload) => {
  if (ioInstance) ioInstance.to(`match:${matchId}`).emit(eventName, payload);
};

