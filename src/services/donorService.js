const { db } = require('../config/database');
const { checkDonorEligibility } = require('./matchingEngine');

/**
 * Creates or updates donor profile and verifies eligibility
 */
function registerDonor({ userId, bloodGroup, dateOfBirth, gender, weightKg, hemoglobin, lastDonationDate, medicalHistory }) {
  const eligibility = checkDonorEligibility({
    weight_kg: Number(weightKg),
    hemoglobin: Number(hemoglobin),
    last_donation_date: lastDonationDate
  });

  const stmt = db.prepare(`
    INSERT INTO donors (user_id, blood_group, date_of_birth, gender, weight_kg, hemoglobin, last_donation_date, medical_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    userId || null,
    bloodGroup,
    dateOfBirth,
    gender,
    Number(weightKg),
    Number(hemoglobin),
    lastDonationDate || null,
    medicalHistory || 'None'
  );

  return {
    id: Number(result.lastInsertRowid),
    bloodGroup,
    eligibility
  };
}

/**
 * Gets a donor's profile with computed eligibility and history
 */
function getDonorProfile(donorId) {
  const donor = db.prepare(`
    SELECT d.*, u.full_name, u.email, u.phone 
    FROM donors d 
    LEFT JOIN users u ON d.user_id = u.id 
    WHERE d.id = ?
  `).get(donorId);

  if (!donor) return null;

  const eligibility = checkDonorEligibility(donor);
  const donations = db.prepare(`
    SELECT * FROM blood_units 
    WHERE donor_id = ? 
    ORDER BY collection_date DESC
  `).all(donorId);

  return {
    ...donor,
    eligibility,
    totalDonations: donations.length,
    donations
  };
}

/**
 * Lists all registered donors
 */
function getAllDonors() {
  const rows = db.prepare(`
    SELECT d.*, u.full_name, u.email, u.phone 
    FROM donors d 
    LEFT JOIN users u ON d.user_id = u.id 
    ORDER BY d.created_at DESC
  `).all();

  return rows.map(d => ({
    ...d,
    eligibility: checkDonorEligibility(d)
  }));
}

/**
 * Finds eligible donors matching specific blood groups for emergency broadcast
 */
function getEligibleDonorsForBroadcast(bloodGroups = []) {
  const donors = getAllDonors();
  return donors.filter(d => {
    const groupMatches = bloodGroups.length === 0 || bloodGroups.includes(d.blood_group);
    return groupMatches && d.eligibility.eligible;
  });
}

module.exports = {
  registerDonor,
  getDonorProfile,
  getAllDonors,
  getEligibleDonorsForBroadcast
};
