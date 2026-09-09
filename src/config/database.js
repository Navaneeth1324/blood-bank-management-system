const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'blood_bank.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
function initDatabase() {
  db.exec(`
    -- Users table (RBAC: ADMIN, STAFF, HOSPITAL, DONOR)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('ADMIN', 'STAFF', 'HOSPITAL', 'DONOR')),
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Donors profile table
    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      date_of_birth DATE NOT NULL,
      gender TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      hemoglobin REAL NOT NULL,
      last_donation_date DATE,
      medical_history TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Blood inventory units
    CREATE TABLE IF NOT EXISTS blood_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode_id TEXT UNIQUE NOT NULL,
      blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      component_type TEXT NOT NULL CHECK(component_type IN ('WHOLE_BLOOD', 'PRBC', 'PLATELETS', 'FFP')),
      volume_ml INTEGER NOT NULL,
      collection_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      storage_rack TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('TESTING', 'AVAILABLE', 'RESERVED', 'EXPIRED', 'DISPATCHED', 'DISCARDED')),
      donor_id INTEGER REFERENCES donors(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Lab Serological / TTI Tests table
    CREATE TABLE IF NOT EXISTS blood_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blood_unit_id INTEGER REFERENCES blood_units(id) ON DELETE CASCADE,
      hiv TEXT NOT NULL DEFAULT 'PENDING' CHECK(hiv IN ('NEGATIVE', 'POSITIVE', 'PENDING')),
      hbv TEXT NOT NULL DEFAULT 'PENDING' CHECK(hbv IN ('NEGATIVE', 'POSITIVE', 'PENDING')),
      hcv TEXT NOT NULL DEFAULT 'PENDING' CHECK(hcv IN ('NEGATIVE', 'POSITIVE', 'PENDING')),
      syphilis TEXT NOT NULL DEFAULT 'PENDING' CHECK(syphilis IN ('NEGATIVE', 'POSITIVE', 'PENDING')),
      malaria TEXT NOT NULL DEFAULT 'PENDING' CHECK(malaria IN ('NEGATIVE', 'POSITIVE', 'PENDING')),
      technician_name TEXT NOT NULL,
      tested_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Hospital blood requisitions
    CREATE TABLE IF NOT EXISTS blood_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospital_name TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      blood_group TEXT NOT NULL CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
      component_type TEXT NOT NULL CHECK(component_type IN ('WHOLE_BLOOD', 'PRBC', 'PLATELETS', 'FFP')),
      units_requested INTEGER NOT NULL CHECK(units_requested > 0),
      urgency TEXT NOT NULL CHECK(urgency IN ('ROUTINE', 'URGENT', 'CRITICAL')),
      doctor_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Unit-to-Requisition Allocation mapping
    CREATE TABLE IF NOT EXISTS request_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER REFERENCES blood_requests(id) ON DELETE CASCADE,
      blood_unit_id INTEGER REFERENCES blood_units(id) ON DELETE CASCADE,
      allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Blood donation camps
    CREATE TABLE IF NOT EXISTS blood_camps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camp_name TEXT NOT NULL,
      venue TEXT NOT NULL,
      camp_date DATE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      organizer_name TEXT NOT NULL,
      organizer_phone TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Camp attendee pre-registrations / RSVPs
    CREATE TABLE IF NOT EXISTS camp_rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      camp_id INTEGER REFERENCES blood_camps(id) ON DELETE CASCADE,
      donor_name TEXT NOT NULL,
      donor_phone TEXT NOT NULL,
      blood_group TEXT NOT NULL,
      registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit trail log
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      actor_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ SQLite Database schema initialized successfully at:', dbPath);
}

module.exports = {
  db,
  initDatabase,
};
