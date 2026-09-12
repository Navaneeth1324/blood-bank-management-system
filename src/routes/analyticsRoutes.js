const express = require('express');
const router = express.Router();
const { db } = require('../config/database');
const { getInventorySummary, updateExpiredUnits } = require('../services/inventoryService');

router.get('/dashboard', (req, res) => {
  try {
    updateExpiredUnits();
    const inventoryMatrix = getInventorySummary();

    let totalAvailableBags = 0;
    const lowStockAlerts = [];

    for (const [group, data] of Object.entries(inventoryMatrix)) {
      totalAvailableBags += data.TOTAL;
      if (data.TOTAL < 5) {
        lowStockAlerts.push({ bloodGroup: group, currentStock: data.TOTAL, threshold: 5 });
      }
    }

    const pendingRequests = db.prepare(`SELECT COUNT(*) as count FROM blood_requests WHERE status = 'PENDING'`).get().count;
    const criticalRequests = db.prepare(`SELECT COUNT(*) as count FROM blood_requests WHERE urgency = 'CRITICAL' AND status = 'PENDING'`).get().count;
    const totalDonors = db.prepare(`SELECT COUNT(*) as count FROM donors`).get().count;
    const upcomingCamps = db.prepare(`SELECT COUNT(*) as count FROM blood_camps`).get().count;
    const testingUnits = db.prepare(`SELECT COUNT(*) as count FROM blood_units WHERE status = 'TESTING'`).get().count;

    res.json({
      totalAvailableBags,
      pendingRequests,
      criticalRequests,
      totalDonors,
      upcomingCamps,
      testingUnits,
      lowStockAlerts,
      inventoryMatrix
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
