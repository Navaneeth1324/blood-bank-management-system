const express = require('express');
const router = express.Router();
const { registerDonor, getDonorProfile, getAllDonors, getEligibleDonorsForBroadcast } = require('../services/donorService');

// Get all donors
router.get('/', (req, res) => {
  try {
    const donors = getAllDonors();
    res.json(donors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single donor profile & digital donor card
router.get('/:id', (req, res) => {
  try {
    const donor = getDonorProfile(Number(req.params.id));
    if (!donor) return res.status(404).json({ error: 'Donor not found' });
    res.json(donor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new donor profile
router.post('/register', (req, res) => {
  try {
    const { userId, bloodGroup, dateOfBirth, gender, weightKg, hemoglobin, lastDonationDate, medicalHistory } = req.body;
    if (!bloodGroup || !dateOfBirth || !gender || !weightKg || !hemoglobin) {
      return res.status(400).json({ error: 'Missing mandatory donor screening fields' });
    }

    const donor = registerDonor({
      userId: userId ? Number(userId) : null,
      bloodGroup,
      dateOfBirth,
      gender,
      weightKg,
      hemoglobin,
      lastDonationDate,
      medicalHistory
    });

    res.status(201).json({ message: 'Donor registered successfully', donor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Broadcast list: eligible donors matching needed blood group
router.get('/broadcast/shortage', (req, res) => {
  try {
    const groups = req.query.groups ? req.query.groups.split(',') : [];
    const eligibleDonors = getEligibleDonorsForBroadcast(groups);
    res.json(eligibleDonors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
