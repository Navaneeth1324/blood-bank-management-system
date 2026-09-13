const express = require('express');
const router = express.Router();
const { 
  createRequisition, 
  findCompatibleUnitsForRequest, 
  approveRequisition, 
  dispatchRequisition, 
  getAllRequisitions 
} = require('../services/requisitionService');

// Get all requisitions
router.get('/', (req, res) => {
  try {
    const { status } = req.query;
    const requests = getAllRequisitions(status);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new hospital blood request
router.post('/', (req, res) => {
  try {
    const { hospitalName, patientName, patientId, bloodGroup, componentType, unitsRequested, urgency, doctorName } = req.body;
    if (!hospitalName || !patientName || !patientId || !bloodGroup || !unitsRequested || !doctorName) {
      return res.status(400).json({ error: 'Missing required requisition fields' });
    }

    const created = createRequisition({
      hospitalName,
      patientName,
      patientId,
      bloodGroup,
      componentType: componentType || 'PRBC',
      unitsRequested: Number(unitsRequested),
      urgency: urgency || 'ROUTINE',
      doctorName
    });

    res.status(201).json({ message: 'Blood requisition submitted successfully', request: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Run ABO/Rh cross-match & FEFO check
router.get('/:id/match', (req, res) => {
  try {
    const match = findCompatibleUnitsForRequest(Number(req.params.id));
    if (!match) {
      return res.status(404).json({ error: 'Requisition not found' });
    }
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff approves requisition and reserves matching units
router.post('/:id/approve', (req, res) => {
  try {
    const { unitIds } = req.body;
    const result = approveRequisition(Number(req.params.id), unitIds || []);
    res.json({ message: 'Requisition approved and blood bags reserved in inventory', result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Staff dispatches approved requisition upon physical pickup
router.post('/:id/dispatch', (req, res) => {
  try {
    const result = dispatchRequisition(Number(req.params.id));
    res.json({ message: 'Requisition dispatched and fulfilled successfully', result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
