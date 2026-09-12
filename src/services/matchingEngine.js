/**
 * ABO / Rh Compatibility & FEFO Matching Engine
 * Implements clinical guidelines for transfusion medicine.
 */

// Red Blood Cells & Whole Blood Compatibility Matrix
const RBC_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

// Fresh Frozen Plasma (FFP) & Platelets Compatibility Matrix
const PLASMA_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+', 'AB-']
};

// Component Shelf-Life in Days
const COMPONENT_SHELF_LIFE_DAYS = {
  'WHOLE_BLOOD': 35,
  'PRBC': 42,
  'PLATELETS': 5,
  'FFP': 365
};

/**
 * Returns an array of compatible donor blood groups for a given recipient
 * @param {string} recipientGroup - e.g. 'A+', 'O-'
 * @param {string} componentType - e.g. 'PRBC', 'FFP'
 * @returns {string[]} compatible donor blood groups
 */
function getCompatibleDonorGroups(recipientGroup, componentType = 'PRBC') {
  if (componentType === 'FFP' || componentType === 'PLATELETS') {
    return PLASMA_COMPATIBILITY[recipientGroup] || [recipientGroup];
  }
  return RBC_COMPATIBILITY[recipientGroup] || [recipientGroup];
}

/**
 * Computes expiration date string (YYYY-MM-DD) from collection date
 * @param {string|Date} collectionDate 
 * @param {string} componentType 
 * @returns {string} ISO Date string YYYY-MM-DD
 */
function calculateExpiryDate(collectionDate, componentType) {
  const date = new Date(collectionDate);
  const daysToAdd = COMPONENT_SHELF_LIFE_DAYS[componentType] || 35;
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().split('T')[0];
}

/**
 * Checks donor donation eligibility (90-day cooldown & vitals)
 * @param {Object} donor
 * @returns {{ eligible: boolean, reason?: string, daysRemaining?: number }}
 */
function checkDonorEligibility(donor) {
  if (donor.weight_kg < 45) {
    return { eligible: false, reason: 'Weight must be at least 45.0 kg' };
  }
  if (donor.hemoglobin < 12.5) {
    return { eligible: false, reason: 'Hemoglobin level must be at least 12.5 g/dL' };
  }

  if (donor.last_donation_date) {
    const lastDate = new Date(donor.last_donation_date);
    const today = new Date();
    const diffTime = today.getTime() - lastDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 90) {
      const daysRemaining = 90 - diffDays;
      return {
        eligible: false,
        daysRemaining,
        reason: `Cooldown active: ${daysRemaining} day(s) remaining until next eligible donation`
      };
    }
  }

  return { eligible: true };
}

module.exports = {
  RBC_COMPATIBILITY,
  PLASMA_COMPATIBILITY,
  COMPONENT_SHELF_LIFE_DAYS,
  getCompatibleDonorGroups,
  calculateExpiryDate,
  checkDonorEligibility
};
