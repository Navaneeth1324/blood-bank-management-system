const { db } = require('../config/database');
const { calculateExpiryDate } = require('./matchingEngine');

/**
 * Automatically flags units past their expiry date as 'EXPIRED'
 */
function updateExpiredUnits() {
  const today = new Date().toISOString().split('T')[0];
  const stmt = db.prepare(`
    UPDATE blood_units 
    SET status = 'EXPIRED' 
    WHERE status = 'AVAILABLE' AND expiry_date < ?
  `);
  const res = stmt.run(today);
  return res.changes;
}

/**
 * Returns total count of available blood units grouped by blood group and component
 */
function getInventorySummary() {
  updateExpiredUnits();
  const rows = db.prepare(`
    SELECT blood_group, component_type, COUNT(*) as count 
    FROM blood_units 
    WHERE status = 'AVAILABLE'
    GROUP BY blood_group, component_type
  `).all();

  // Matrix initialized with 0 for all standard 8 groups
  const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['WHOLE_BLOOD', 'PRBC', 'PLATELETS', 'FFP'];
  
  const matrix = {};
  for (const g of groups) {
    matrix[g] = { WHOLE_BLOOD: 0, PRBC: 0, PLATELETS: 0, FFP: 0, TOTAL: 0 };
  }

  for (const r of rows) {
    if (matrix[r.blood_group]) {
      matrix[r.blood_group][r.component_type] = r.count;
      matrix[r.blood_group].TOTAL += r.count;
    }
  }

  return matrix;
}

/**
 * Intakes a new blood bag from a donation
 */
function intakeBloodBag({ barcodeId, bloodGroup, componentType, volumeMl, collectionDate, storageRack, donorId }) {
  const expiryDate = calculateExpiryDate(collectionDate, componentType);
  const stmt = db.prepare(`
    INSERT INTO blood_units (barcode_id, blood_group, component_type, volume_ml, collection_date, expiry_date, storage_rack, status, donor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'TESTING', ?)
  `);
  
  const result = stmt.run(barcodeId, bloodGroup, componentType, volumeMl || 350, collectionDate, expiryDate, storageRack || 'RACK-A1', donorId || null);
  const unitId = Number(result.lastInsertRowid);

  // Initialize pending TTI test record
  db.prepare(`
    INSERT INTO blood_tests (blood_unit_id, hiv, hbv, hcv, syphilis, malaria, technician_name)
    VALUES (?, 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'Pending Lab Assignment')
  `).run(unitId);

  return { id: unitId, barcodeId, expiryDate, status: 'TESTING' };
}

/**
 * Submits serology lab test results for a blood unit
 */
function recordTestResults(unitId, { hiv, hbv, hcv, syphilis, malaria, technicianName }) {
  const isSafe = (hiv === 'NEGATIVE' && hbv === 'NEGATIVE' && hcv === 'NEGATIVE' && syphilis === 'NEGATIVE' && malaria === 'NEGATIVE');
  const isReactive = (hiv === 'POSITIVE' || hbv === 'POSITIVE' || hcv === 'POSITIVE' || syphilis === 'POSITIVE' || malaria === 'POSITIVE');

  const newStatus = isSafe ? 'AVAILABLE' : (isReactive ? 'DISCARDED' : 'TESTING');

  db.prepare(`
    UPDATE blood_tests 
    SET hiv = ?, hbv = ?, hcv = ?, syphilis = ?, malaria = ?, technician_name = ?, tested_at = CURRENT_TIMESTAMP
    WHERE blood_unit_id = ?
  `).run(hiv, hbv, hcv, syphilis, malaria, technicianName || 'Staff Lab Tech', unitId);

  db.prepare(`UPDATE blood_units SET status = ? WHERE id = ?`).run(newStatus, unitId);

  return { unitId, status: newStatus, safe: isSafe };
}

/**
 * Fetches all blood units with optional status filter
 */
function getAllUnits(status = null) {
  updateExpiredUnits();
  let query = `
    SELECT u.*, d.weight_kg, d.hemoglobin, t.hiv, t.hbv, t.hcv, t.syphilis, t.malaria, t.technician_name
    FROM blood_units u
    LEFT JOIN donors d ON u.donor_id = d.id
    LEFT JOIN blood_tests t ON u.id = t.blood_unit_id
  `;
  if (status) {
    query += ` WHERE u.status = ? ORDER BY u.expiry_date ASC`;
    return db.prepare(query).all(status);
  } else {
    query += ` ORDER BY u.created_at DESC LIMIT 100`;
    return db.prepare(query).all();
  }
}

module.exports = {
  updateExpiredUnits,
  getInventorySummary,
  intakeBloodBag,
  recordTestResults,
  getAllUnits
};
