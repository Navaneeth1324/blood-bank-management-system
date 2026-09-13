const { db } = require('../config/database');
const { getCompatibleDonorGroups } = require('./matchingEngine');
const { updateExpiredUnits } = require('./inventoryService');

/**
 * Creates a new hospital requisition
 */
function createRequisition({ hospitalName, patientName, patientId, bloodGroup, componentType, unitsRequested, urgency, doctorName }) {
  const stmt = db.prepare(`
    INSERT INTO blood_requests (hospital_name, patient_name, patient_id, blood_group, component_type, units_requested, urgency, doctor_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
  `);
  const result = stmt.run(
    hospitalName,
    patientName,
    patientId,
    bloodGroup,
    componentType || 'PRBC',
    Number(unitsRequested),
    urgency || 'ROUTINE',
    doctorName
  );
  return { id: Number(result.lastInsertRowid), status: 'PENDING' };
}

/**
 * Finds compatible available units for a given request using FEFO
 */
function findCompatibleUnitsForRequest(requestId) {
  updateExpiredUnits();
  const req = db.prepare(`SELECT * FROM blood_requests WHERE id = ?`).get(requestId);
  if (!req) return null;

  const compatibleGroups = getCompatibleDonorGroups(req.blood_group, req.component_type);
  const placeholders = compatibleGroups.map(() => '?').join(',');

  const query = `
    SELECT * FROM blood_units
    WHERE status = 'AVAILABLE'
      AND component_type = ?
      AND blood_group IN (${placeholders})
    ORDER BY expiry_date ASC
  `;

  const availableUnits = db.prepare(query).all(req.component_type, ...compatibleGroups);
  return {
    request: req,
    compatibleGroups,
    availableCount: availableUnits.length,
    matchingUnits: availableUnits.slice(0, req.units_requested),
    canFulfill: availableUnits.length >= req.units_requested
  };
}

/**
 * Approves a request and reserves the units
 */
function approveRequisition(requestId, selectedUnitIds = []) {
  const req = db.prepare(`SELECT * FROM blood_requests WHERE id = ?`).get(requestId);
  if (!req || req.status !== 'PENDING') {
    throw new Error('Request not found or not in PENDING state');
  }

  // If unit IDs not explicitly passed, auto-select using FEFO
  let unitIds = selectedUnitIds;
  if (!unitIds || unitIds.length === 0) {
    const match = findCompatibleUnitsForRequest(requestId);
    if (!match.canFulfill) {
      throw new Error(`Insufficient compatible units available in inventory (Need ${req.units_requested}, Found ${match.availableCount})`);
    }
    unitIds = match.matchingUnits.map(u => u.id);
  }

  // Execute reservation
  db.exec('BEGIN TRANSACTION');
  try {
    for (const unitId of unitIds) {
      db.prepare(`UPDATE blood_units SET status = 'RESERVED' WHERE id = ? AND status = 'AVAILABLE'`).run(unitId);
      db.prepare(`INSERT INTO request_allocations (request_id, blood_unit_id) VALUES (?, ?)`).run(requestId, unitId);
    }
    db.prepare(`UPDATE blood_requests SET status = 'APPROVED' WHERE id = ?`).run(requestId);
    db.exec('COMMIT');
    return { success: true, allocatedUnitIds: unitIds };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Dispatches an approved request
 */
function dispatchRequisition(requestId) {
  const req = db.prepare(`SELECT * FROM blood_requests WHERE id = ?`).get(requestId);
  if (!req || req.status !== 'APPROVED') {
    throw new Error('Request must be in APPROVED state to dispatch');
  }

  const allocations = db.prepare(`SELECT blood_unit_id FROM request_allocations WHERE request_id = ?`).all(requestId);

  db.exec('BEGIN TRANSACTION');
  try {
    for (const alloc of allocations) {
      db.prepare(`UPDATE blood_units SET status = 'DISPATCHED' WHERE id = ?`).run(alloc.blood_unit_id);
    }
    db.prepare(`UPDATE blood_requests SET status = 'FULFILLED' WHERE id = ?`).run(requestId);
    db.exec('COMMIT');
    return { success: true, fulfilledUnits: allocations.length };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Retrieves all requisitions
 */
function getAllRequisitions(status = null) {
  let query = `
    SELECT r.*, 
      (SELECT COUNT(*) FROM request_allocations a WHERE a.request_id = r.id) as allocated_count
    FROM blood_requests r
  `;
  if (status) {
    query += ` WHERE r.status = ? ORDER BY r.created_at DESC`;
    return db.prepare(query).all(status);
  }
  query += ` ORDER BY 
    CASE r.urgency 
      WHEN 'CRITICAL' THEN 1 
      WHEN 'URGENT' THEN 2 
      ELSE 3 
    END, r.created_at DESC`;
  return db.prepare(query).all();
}

module.exports = {
  createRequisition,
  findCompatibleUnitsForRequest,
  approveRequisition,
  dispatchRequisition,
  getAllRequisitions
};
