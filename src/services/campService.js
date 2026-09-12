const { db } = require('../config/database');

/**
 * Creates a new blood donation camp
 */
function createCamp({ campName, venue, campDate, startTime, endTime, organizerName, organizerPhone }) {
  const stmt = db.prepare(`
    INSERT INTO blood_camps (camp_name, venue, camp_date, start_time, end_time, organizer_name, organizer_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(campName, venue, campDate, startTime, endTime, organizerName, organizerPhone);
  return { id: Number(result.lastInsertRowid), campName, campDate };
}

/**
 * Retrieves all blood donation camps with RSVP counts
 */
function getAllCamps() {
  const camps = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM camp_rsvps r WHERE r.camp_id = c.id) as rsvp_count
    FROM blood_camps c
    ORDER BY c.camp_date ASC
  `).all();
  return camps;
}

/**
 * Pre-registers a donor RSVP for an upcoming camp
 */
function registerCampRsvp({ campId, donorName, donorPhone, bloodGroup }) {
  const stmt = db.prepare(`
    INSERT INTO camp_rsvps (camp_id, donor_name, donor_phone, blood_group)
    VALUES (?, ?, ?, ?)
  `);
  const result = stmt.run(Number(campId), donorName, donorPhone, bloodGroup);
  return { id: Number(result.lastInsertRowid), campId, donorName };
}

/**
 * Gets all RSVPs for a given camp
 */
function getCampRsvps(campId) {
  return db.prepare(`SELECT * FROM camp_rsvps WHERE camp_id = ? ORDER BY registered_at DESC`).all(Number(campId));
}

module.exports = {
  createCamp,
  getAllCamps,
  registerCampRsvp,
  getCampRsvps
};
