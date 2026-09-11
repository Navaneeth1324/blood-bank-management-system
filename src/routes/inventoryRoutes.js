const express = require('express');
const router = express.Router();
const { getInventorySummary, intakeBloodBag, recordTestResults, getAllUnits } = require('../services/inventoryService');

// Get real-time stock summary matrix
router.get('/summary', (req, res) => {
  try {
    const summary = getInventorySummary();
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get blood units list (optional ?status=AVAILABLE)
router.get('/units', (req, res) => {
  try {
    const { status } = req.query;
    const units = getAllUnits(status);
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Blood bag intake
router.post('/intake', (req, res) => {
  try {
    const { barcodeId, bloodGroup, componentType, volumeMl, collectionDate, storageRack, donorId } = req.body;
    if (!barcodeId || !bloodGroup || !componentType || !collectionDate) {
      return res.status(400).json({ error: 'barcodeId, bloodGroup, componentType, and collectionDate are required' });
    }

    const unit = intakeBloodBag({
      barcodeId,
      bloodGroup,
      componentType,
      volumeMl: Number(volumeMl) || 350,
      collectionDate,
      storageRack: storageRack || 'RACK-A1',
      donorId: donorId ? Number(donorId) : null
    });

    res.status(201).json({ message: 'Blood bag registered into testing queue', unit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record TTI lab test results
router.post('/tests/:unitId', (req, res) => {
  try {
    const { unitId } = req.params;
    const { hiv, hbv, hcv, syphilis, malaria, technicianName } = req.body;

    if (!hiv || !hbv || !hcv || !syphilis || !malaria) {
      return res.status(400).json({ error: 'All 5 TTI serology test results must be specified (NEGATIVE/POSITIVE)' });
    }

    const result = recordTestResults(Number(unitId), {
      hiv, hbv, hcv, syphilis, malaria,
      technicianName: technicianName || 'Certified Lab Tech'
    });

    res.json({
      message: result.safe 
        ? 'All serology tests NEGATIVE. Unit approved and available for transfusion.' 
        : 'Reactive / Positive test detected. Unit quarantined and marked DISCARDED.',
      result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
