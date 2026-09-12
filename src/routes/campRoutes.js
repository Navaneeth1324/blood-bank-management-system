const express = require('express');
const router = express.Router();
const { createCamp, getAllCamps, registerCampRsvp, getCampRsvps } = require('../services/campService');

// Get all donation camps
router.get('/', (req, res) => {
  try {
    const camps = getAllCamps();
    res.json(camps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Schedule new camp
router.post('/', (req, res) => {
  try {
    const { campName, venue, campDate, startTime, endTime, organizerName, organizerPhone } = req.body;
    if (!campName || !venue || !campDate || !organizerName || !organizerPhone) {
      return res.status(400).json({ error: 'Missing mandatory camp scheduling fields' });
    }

    const camp = createCamp({
      campName,
      venue,
      campDate,
      startTime: startTime || '09:00 AM',
      endTime: endTime || '05:00 PM',
      organizerName,
      organizerPhone
    });

    res.status(201).json({ message: 'Blood donation camp scheduled successfully', camp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// RSVP for a camp
router.post('/:id/rsvp', (req, res) => {
  try {
    const { donorName, donorPhone, bloodGroup } = req.body;
    if (!donorName || !donorPhone || !bloodGroup) {
      return res.status(400).json({ error: 'donorName, donorPhone, and bloodGroup are required' });
    }

    const rsvp = registerCampRsvp({
      campId: Number(req.params.id),
      donorName,
      donorPhone,
      bloodGroup
    });

    res.status(201).json({ message: 'Camp RSVP registered successfully! We look forward to seeing you.', rsvp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// View attendees for a camp
router.get('/:id/rsvps', (req, res) => {
  try {
    const rsvps = getCampRsvps(Number(req.params.id));
    res.json(rsvps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
