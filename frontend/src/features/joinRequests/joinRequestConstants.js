export const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];
export const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni', 'Other'];
export const PREFERRED_FEET = ['Left', 'Right', 'Both'];
export const AVAILABILITY = ['available', 'injured', 'suspended', 'unavailable'];
export const statusClass = {
  pending: 'status-badge border-amber-300/20 bg-amber-300/10 text-amber-100',
  approved: 'status-badge status-active',
  rejected: 'status-badge border-red-300/20 bg-red-300/10 text-red-100',
};
export const statusLabel = (value = '') => value.charAt(0).toUpperCase() + value.slice(1);
