const { db, initDatabase } = require('./config/database');
const { hashPassword } = require('./services/authService');
const { calculateExpiryDate } = require('./services/matchingEngine');

function seedData() {
  initDatabase();

  console.log('🌱 Clearing existing records for clean seed...');
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM camp_rsvps;
    DELETE FROM blood_camps;
    DELETE FROM request_allocations;
    DELETE FROM blood_requests;
    DELETE FROM blood_tests;
    DELETE FROM blood_units;
    DELETE FROM donors;
    DELETE FROM users;
  `);

  console.log('👤 Seeding users across all 4 RBAC roles...');
  const userStmt = db.prepare(`
    INSERT INTO users (email, password_hash, role, full_name, phone)
    VALUES (?, ?, ?, ?, ?)
  `);

  const adminId = Number(userStmt.run('admin@bloodbank.org', hashPassword('admin123'), 'ADMIN', 'Dr. Rajesh Sharma (Director)', '+91-9876543210').lastInsertRowid);
  const staffId = Number(userStmt.run('staff@bloodbank.org', hashPassword('staff123'), 'STAFF', 'Pooja Hegde (Senior Lab Technician)', '+91-9876543211').lastInsertRowid);
  const hosp1Id = Number(userStmt.run('manipal@hospital.org', hashPassword('hospital123'), 'HOSPITAL', 'Manipal Hospital Bengaluru', '+91-80-2502-4444').lastInsertRowid);
  const hosp2Id = Number(userStmt.run('apollo@hospital.org', hashPassword('hospital123'), 'HOSPITAL', 'Apollo Hospitals Bannerghatta', '+91-80-2630-4050').lastInsertRowid);
  const donorUser1Id = Number(userStmt.run('rohit.sharma@gmail.com', hashPassword('donor123'), 'DONOR', 'Rohit Sharma', '+91-9845012345').lastInsertRowid);
  const donorUser2Id = Number(userStmt.run('ananya.rao@gmail.com', hashPassword('donor123'), 'DONOR', 'Ananya Rao', '+91-9845098765').lastInsertRowid);

  console.log('🩸 Seeding donor profiles (eligible & cooldown-active)...');
  const donorStmt = db.prepare(`
    INSERT INTO donors (user_id, blood_group, date_of_birth, gender, weight_kg, hemoglobin, last_donation_date, medical_history)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Eligible donor (donated 120 days ago)
  const d1Id = Number(donorStmt.run(donorUser1Id, 'O-', '2001-05-14', 'Male', 72.5, 14.8, '2026-05-15', 'None. Regular voluntary donor.').lastInsertRowid);
  // Cooldown active donor (donated 25 days ago)
  const d2Id = Number(donorStmt.run(donorUser2Id, 'A+', '2003-11-20', 'Female', 58.0, 13.2, '2026-08-20', 'No chronic illnesses.').lastInsertRowid);
  // Additional donors
  const d3Id = Number(donorStmt.run(null, 'B+', '1999-02-10', 'Male', 68.0, 14.2, '2026-04-01', 'None').lastInsertRowid);
  const d4Id = Number(donorStmt.run(null, 'AB+', '2002-08-15', 'Female', 54.0, 13.0, null, 'First-time donor').lastInsertRowid);
  const d5Id = Number(donorStmt.run(null, 'O+', '1998-10-30', 'Male', 80.0, 15.1, '2026-01-10', 'None').lastInsertRowid);

  console.log('📦 Seeding inventory blood units & lab tests...');
  const unitStmt = db.prepare(`
    INSERT INTO blood_units (barcode_id, blood_group, component_type, volume_ml, collection_date, expiry_date, storage_rack, status, donor_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const testStmt = db.prepare(`
    INSERT INTO blood_tests (blood_unit_id, hiv, hbv, hcv, syphilis, malaria, technician_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const stockData = [
    // O- (Universal red cell donor)
    { barcode: 'BLD-2026-001', group: 'O-', type: 'PRBC', vol: 350, date: '2026-09-01', rack: 'RACK-A1-01', status: 'AVAILABLE', donor: d1Id },
    { barcode: 'BLD-2026-002', group: 'O-', type: 'PRBC', vol: 350, date: '2026-09-05', rack: 'RACK-A1-02', status: 'AVAILABLE', donor: d1Id },
    { barcode: 'BLD-2026-003', group: 'O-', type: 'WHOLE_BLOOD', vol: 450, date: '2026-08-28', rack: 'RACK-A1-03', status: 'AVAILABLE', donor: d1Id },
    
    // O+
    { barcode: 'BLD-2026-004', group: 'O+', type: 'PRBC', vol: 350, date: '2026-09-02', rack: 'RACK-A2-01', status: 'AVAILABLE', donor: d5Id },
    { barcode: 'BLD-2026-005', group: 'O+', type: 'FFP', vol: 200, date: '2026-08-15', rack: 'FREEZER-F1', status: 'AVAILABLE', donor: d5Id },
    { barcode: 'BLD-2026-006', group: 'O+', type: 'PLATELETS', vol: 250, date: '2026-09-12', rack: 'AGITATOR-01', status: 'AVAILABLE', donor: d5Id },

    // A+
    { barcode: 'BLD-2026-007', group: 'A+', type: 'PRBC', vol: 350, date: '2026-09-03', rack: 'RACK-B1-01', status: 'AVAILABLE', donor: d2Id },
    { barcode: 'BLD-2026-008', group: 'A+', type: 'WHOLE_BLOOD', vol: 450, date: '2026-09-08', rack: 'RACK-B1-02', status: 'AVAILABLE', donor: d2Id },
    { barcode: 'BLD-2026-009', group: 'A+', type: 'FFP', vol: 200, date: '2026-07-10', rack: 'FREEZER-F1', status: 'AVAILABLE', donor: d2Id },

    // A-
    { barcode: 'BLD-2026-010', group: 'A-', type: 'PRBC', vol: 350, date: '2026-09-06', rack: 'RACK-B2-01', status: 'AVAILABLE', donor: null },

    // B+
    { barcode: 'BLD-2026-011', group: 'B+', type: 'PRBC', vol: 350, date: '2026-09-04', rack: 'RACK-C1-01', status: 'AVAILABLE', donor: d3Id },
    { barcode: 'BLD-2026-012', group: 'B+', type: 'PLATELETS', vol: 250, date: '2026-09-13', rack: 'AGITATOR-01', status: 'AVAILABLE', donor: d3Id },
    { barcode: 'BLD-2026-013', group: 'B+', type: 'WHOLE_BLOOD', vol: 450, date: '2026-09-09', rack: 'RACK-C1-02', status: 'AVAILABLE', donor: d3Id },

    // B-
    { barcode: 'BLD-2026-014', group: 'B-', type: 'PRBC', vol: 350, date: '2026-09-07', rack: 'RACK-C2-01', status: 'AVAILABLE', donor: null },

    // AB+ (Universal recipient, universal plasma donor)
    { barcode: 'BLD-2026-015', group: 'AB+', type: 'FFP', vol: 200, date: '2026-06-20', rack: 'FREEZER-F2', status: 'AVAILABLE', donor: d4Id },
    { barcode: 'BLD-2026-016', group: 'AB+', type: 'PRBC', vol: 350, date: '2026-09-05', rack: 'RACK-D1-01', status: 'AVAILABLE', donor: d4Id },

    // AB-
    { barcode: 'BLD-2026-017', group: 'AB-', type: 'PRBC', vol: 350, date: '2026-09-08', rack: 'RACK-D2-01', status: 'AVAILABLE', donor: null },

    // Units in TESTING (for live technician verification demo)
    { barcode: 'BLD-2026-018', group: 'O+', type: 'PRBC', vol: 350, date: '2026-09-14', rack: 'QUARANTINE-01', status: 'TESTING', donor: d5Id },
    { barcode: 'BLD-2026-019', group: 'B+', type: 'WHOLE_BLOOD', vol: 450, date: '2026-09-14', rack: 'QUARANTINE-01', status: 'TESTING', donor: d3Id }
  ];

  for (const s of stockData) {
    const expiry = calculateExpiryDate(s.date, s.type);
    const uId = Number(unitStmt.run(s.barcode, s.group, s.type, s.vol, s.date, expiry, s.rack, s.status, s.donor).lastInsertRowid);
    
    if (s.status === 'AVAILABLE') {
      testStmt.run(uId, 'NEGATIVE', 'NEGATIVE', 'NEGATIVE', 'NEGATIVE', 'NEGATIVE', 'Pooja Hegde (Sr. Tech)');
    } else {
      testStmt.run(uId, 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'PENDING', 'Pending Lab Assignment');
    }
  }

  console.log('🏥 Seeding hospital requisitions (Critical & Urgent)...');
  const reqStmt = db.prepare(`
    INSERT INTO blood_requests (hospital_name, patient_name, patient_id, blood_group, component_type, units_requested, urgency, doctor_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  reqStmt.run('Manipal Hospital Bengaluru', 'Kavitha Murthy', 'MAN-2026-8921', 'O-', 'PRBC', 2, 'CRITICAL', 'Dr. Anand Rao', 'PENDING');
  reqStmt.run('Apollo Hospitals Bannerghatta', 'Suresh Nair', 'APO-2026-4431', 'A+', 'PRBC', 1, 'URGENT', 'Dr. Meera Sen', 'PENDING');
  reqStmt.run('Fortis Hospital Cunningham', 'Ramesh Kumar', 'FOR-2026-1102', 'B+', 'WHOLE_BLOOD', 1, 'ROUTINE', 'Dr. Vinod Joshi', 'PENDING');

  console.log('⛺ Seeding blood donation drives / camps...');
  const campStmt = db.prepare(`
    INSERT INTO blood_camps (camp_name, venue, camp_date, start_time, end_time, organizer_name, organizer_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const c1Id = Number(campStmt.run(
    'PES University Mega Blood Donation Drive 2026',
    'PES University Campus, 100 Feet Ring Road, BSK 3rd Stage, Bengaluru',
    '2026-09-26',
    '09:00 AM',
    '05:00 PM',
    'PESU Youth Red Cross & Rotaract Club',
    '+91-80-2672-1983'
  ).lastInsertRowid);

  const c2Id = Number(campStmt.run(
    'Bengaluru City Blood Donation Camp',
    'Jayanagar 4th Block Community Center, Bengaluru',
    '2026-10-03',
    '10:00 AM',
    '04:00 PM',
    'Red Cross Society Bengaluru Chapter',
    '+91-80-2226-4205'
  ).lastInsertRowid);

  // Seed sample RSVP
  db.prepare(`
    INSERT INTO camp_rsvps (camp_id, donor_name, donor_phone, blood_group)
    VALUES (?, ?, ?, ?)
  `).run(c1Id, 'Harish Gowda', '+91-9880123456', 'O+');

  console.log('🎉 Seed complete! Default Login Credentials:');
  console.log('====================================================');
  console.log('🛡️  Admin:    admin@bloodbank.org    / admin123');
  console.log('🔬 Staff:    staff@bloodbank.org    / staff123');
  console.log('🏥 Hospital: manipal@hospital.org   / hospital123');
  console.log('❤️  Donor:    rohit.sharma@gmail.com / donor123');
  console.log('====================================================');
}

if (require.main === module) {
  seedData();
}

module.exports = { seedData };
