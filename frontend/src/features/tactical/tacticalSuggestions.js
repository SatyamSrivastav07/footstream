const POSITION_GROUPS = [
  { id: 'goalkeeper', labels: ['GK', 'GOALKEEPER', 'KEEPER'] },
  { id: 'defender', labels: ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF', 'DF', 'BACK'] },
  { id: 'midfielder', labels: ['CDM', 'CM', 'CAM', 'LM', 'RM', 'MID', 'MF'] },
  { id: 'winger', labels: ['LW', 'RW', 'WING', 'WINGER'] },
  { id: 'forward', labels: ['ST', 'CF', 'FW', 'FWD', 'ATTACKER', 'STRIKER'] },
];

export const positionGroup = (position = '') => {
  const normalized = String(position || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (!normalized) return 'unknown';
  return POSITION_GROUPS.find((group) => group.labels.some((label) => normalized.includes(label)))?.id || 'unknown';
};

export const suggestReplacements = (sourcePlayer, benchPlayers = []) => {
  const sourceGroup = positionGroup(sourcePlayer?.position);
  const withMeta = benchPlayers.map((player, index) => ({
    player,
    index,
    group: positionGroup(player?.position),
  }));
  if (sourceGroup === 'unknown') return [];
  return withMeta
    .filter((item) => item.group === sourceGroup)
    .sort((a, b) => String(a.player?.name || '').localeCompare(String(b.player?.name || '')) || a.index - b.index)
    .map((item) => item.player);
};
