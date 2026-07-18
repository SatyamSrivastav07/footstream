const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const lineRoles = ['DEF', 'MID', 'AM', 'FWD', 'FWD'];

const generateSlots = (pattern) => {
  const lines = String(pattern || '').split('-').map((part) => Number(part)).filter(Boolean);
  if (!lines.length) return [];
  const slots = [{ id: 'GK', slotId: 'GK', role: 'GK', label: 'Goalkeeper', x: 50, y: 90 }];
  lines.forEach((count, lineIndex) => {
    const y = lines.length === 1 ? 50 : 74 - (lineIndex * (56 / Math.max(lines.length - 1, 1)));
    const role = lineRoles[lineIndex] || 'FWD';
    for (let index = 0; index < count; index += 1) {
      const x = ((index + 1) / (count + 1)) * 100;
      slots.push({
        id: `L${lineIndex + 1}-P${index + 1}`,
        slotId: `L${lineIndex + 1}-P${index + 1}`,
        role,
        label: `${role} ${index + 1}`,
        x: clamp(Math.round(x), 8, 92),
        y: clamp(Math.round(y), 10, 90),
      });
    }
  });
  return slots;
};

const preset = ({ id, label = id, playerCount, pattern, description }) => ({
  id,
  label,
  mode: 'preset',
  playerCount,
  pattern,
  description: description || `${label} tactical shape`,
  slots: generateSlots(pattern),
});

export const MANUAL_FORMATION_ID = 'manual';

export const FORMATION_DEFINITIONS = [
  preset({ id: '4-3-3', playerCount: 11, pattern: '4-3-3' }),
  preset({ id: '4-4-2', playerCount: 11, pattern: '4-4-2' }),
  preset({ id: '4-2-3-1', playerCount: 11, pattern: '4-2-3-1' }),
  preset({ id: '3-5-2', playerCount: 11, pattern: '3-5-2' }),
  preset({ id: '3-4-3', playerCount: 11, pattern: '3-4-3' }),
  preset({ id: '5-3-2', playerCount: 11, pattern: '5-3-2' }),
  preset({ id: '5-4-1', playerCount: 11, pattern: '5-4-1' }),
  preset({ id: '5-a-side', playerCount: 5, pattern: '1-2-1', description: 'Compact five-a-side shape' }),
  preset({ id: '6-a-side', playerCount: 6, pattern: '2-2-1', description: 'Balanced six-a-side shape' }),
  preset({ id: '7-a-side', playerCount: 7, pattern: '2-3-1', description: 'Wide seven-a-side shape' }),
  preset({ id: '8-a-side', playerCount: 8, pattern: '3-3-1', description: 'Training eight-a-side shape' }),
  preset({ id: '9-a-side', playerCount: 9, pattern: '3-3-2', description: 'Development nine-a-side shape' }),
  {
    id: MANUAL_FORMATION_ID,
    label: 'Manual',
    mode: 'manual',
    playerCount: 11,
    pattern: '',
    description: 'Free tactical whiteboard with draggable percentage coordinates.',
    slots: [],
  },
];

export const DEFAULT_FORMATION_ID = '4-3-3';

export const getFormationDefinition = (formationId) =>
  FORMATION_DEFINITIONS.find((formation) => formation.id === formationId) ||
  FORMATION_DEFINITIONS.find((formation) => formation.id === DEFAULT_FORMATION_ID);

export const isManualFormation = (formationId) => formationId === MANUAL_FORMATION_ID;

export const clampCoordinate = (value) => clamp(Number.isFinite(Number(value)) ? Number(value) : 50, 5, 95);

