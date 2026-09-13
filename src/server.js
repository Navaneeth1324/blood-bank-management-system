const express = require('express');
const path = require('node:path');
const { initDatabase } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const requisitionRoutes = require('./routes/requisitionRoutes');
const donorRoutes = require('./routes/donorRoutes');
const campRoutes = require('./routes/campRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Initialize database schema
initDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
// Also serve docs directly so SRS report can be read in browser
app.use('/docs', express.static(path.join(__dirname, '../docs')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/requests', requisitionRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/camps', campRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', project: 'Blood Bank Management System', team: 'T9', slNo: 9 });
});

// Fallback to index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🩸 Blood Bank Management System (Team T9 - PES University)`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📄 View IEEE SRS Report: http://localhost:${PORT}/docs/SRS_Report.html`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
