export const POSITIONS = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'CAM', 'RM', 'LM', 'RW', 'LW', 'CF', 'ST'];
export const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni', 'Other'];
export const PREFERRED_FEET = ['Left', 'Right', 'Both'];
export const AVAILABILITY = ['available', 'injured', 'suspended', 'unavailable'];

export const availabilityLabel = (value) => value.charAt(0).toUpperCase() + value.slice(1);

export const emptyPlayer = Object.freeze({
  name: '',
  position: '',
  jerseyNumber: '',
  age: '',
  academicYear: '',
  preferredFoot: '',
  availabilityStatus: 'available',
  isCaptain: false,
  isViceCaptain: false,
});
