const assert = require('node:assert');
const { 
  getCompatibleDonorGroups, 
  calculateExpiryDate, 
  checkDonorEligibility,
  RBC_COMPATIBILITY,
  PLASMA_COMPATIBILITY 
} = require('./services/matchingEngine');
const { db, initDatabase } = require('./config/database');
const { 
  createRequisition, 
  findCompatibleUnitsForRequest, 
  approveRequisition, 
  dispatchRequisition 
} = require('./services/requisitionService');
const { intakeBloodBag, recordTestResults, getInventorySummary } = require('./services/inventoryService');

console.log('🧪 Starting Blood Bank Management System Test Suite...\n');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// Test 1: ABO/Rh Compatibility Rules
runTest('ABO Red Blood Cell compatibility conforms to clinical guidelines', () => {
  // O- can only receive O-
  assert.deepStrictEqual(getCompatibleDonorGroups('O-', 'PRBC'), ['O-']);
  
  // AB+ can receive all 8 groups
  assert.strictEqual(getCompatibleDonorGroups('AB+', 'PRBC').length, 8);
  
  // A+ can receive O-, O+, A-, A+
  const aPlusDonors = getCompatibleDonorGroups('A+', 'PRBC');
  assert.ok(aPlusDonors.includes('O-'));
  assert.ok(aPlusDonors.includes('O+'));
  assert.ok(aPlusDonors.includes('A-'));
  assert.ok(aPlusDonors.includes('A+'));
  assert.ok(!aPlusDonors.includes('B+'));
});

// Test 2: Plasma Compatibility Inversion
runTest('Plasma (FFP) compatibility reverses red cell donor/recipient hierarchy', () => {
  // O- is universal plasma recipient (can receive all)
  const oMinusPlasma = getCompatibleDonorGroups('O-', 'FFP');
  assert.strictEqual(oMinusPlasma.length, 8);
  
  // AB+ is universal plasma donor (can only receive AB+)
  const abPlusPlasma = getCompatibleDonorGroups('AB+', 'FFP');
  assert.ok(abPlusPlasma.includes('AB+'));
});

// Test 3: Component Expiration Calculation
runTest('Component shelf-life is calculated accurately from collection date', () => {
  const collectionDate = '2026-09-01';
  assert.strictEqual(calculateExpiryDate(collectionDate, 'PLATELETS'), '2026-09-06'); // +5 days
  assert.strictEqual(calculateExpiryDate(collectionDate, 'WHOLE_BLOOD'), '2026-10-06'); // +35 days
  assert.strictEqual(calculateExpiryDate(collectionDate, 'PRBC'), '2026-10-13'); // +42 days
});

// Test 4: Donor Eligibility Cooldown & Vitals
runTest('Donor eligibility enforces 90-day cooldown, weight >= 45kg, and Hb >= 12.5', () => {
  // Underweight
  const resWeight = checkDonorEligibility({ weight_kg: 42, hemoglobin: 13.5 });
  assert.strictEqual(resWeight.eligible, false);
  assert.ok(resWeight.reason.includes('Weight'));

  // Low hemoglobin
  const resHb = checkDonorEligibility({ weight_kg: 60, hemoglobin: 11.2 });
  assert.strictEqual(resHb.eligible, false);
  assert.ok(resHb.reason.includes('Hemoglobin'));

  // Cooldown active (donated 30 days ago)
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const resCooldown = checkDonorEligibility({ weight_kg: 65, hemoglobin: 14.0, last_donation_date: thirtyDaysAgo });
  assert.strictEqual(resCooldown.eligible, false);
  assert.strictEqual(resCooldown.daysRemaining, 60);

  // Eligible donor (donated 100 days ago)
  const hundredDaysAgo = new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const resOk = checkDonorEligibility({ weight_kg: 65, hemoglobin: 14.0, last_donation_date: hundredDaysAgo });
  assert.strictEqual(resOk.eligible, true);
});

// Test 5: Serology Testing Gate (Quarantine -> Available vs Discarded)
runTest('TTI Serology gate safely approves negative units and discards reactive units', () => {
  initDatabase();
  
  // Intake sample bag
  const bagSafe = intakeBloodBag({
    barcodeId: 'TEST-BAG-SAFE-01',
    bloodGroup: 'B+',
    componentType: 'PRBC',
    volumeMl: 350,
    collectionDate: '2026-09-10',
    storageRack: 'RACK-TEST',
    donorId: null
  });
  assert.strictEqual(bagSafe.status, 'TESTING');

  // Submit all negative serology tests
  const safeRes = recordTestResults(bagSafe.id, {
    hiv: 'NEGATIVE',
    hbv: 'NEGATIVE',
    hcv: 'NEGATIVE',
    syphilis: 'NEGATIVE',
    malaria: 'NEGATIVE',
    technicianName: 'Tester'
  });
  assert.strictEqual(safeRes.safe, true);
  assert.strictEqual(safeRes.status, 'AVAILABLE');

  // Intake second sample bag
  const bagReactive = intakeBloodBag({
    barcodeId: 'TEST-BAG-REACTIVE-02',
    bloodGroup: 'A+',
    componentType: 'PRBC',
    volumeMl: 350,
    collectionDate: '2026-09-10',
    storageRack: 'RACK-TEST',
    donorId: null
  });

  // Submit reactive test
  const reactiveRes = recordTestResults(bagReactive.id, {
    hiv: 'POSITIVE',
    hbv: 'NEGATIVE',
    hcv: 'NEGATIVE',
    syphilis: 'NEGATIVE',
    malaria: 'NEGATIVE',
    technicianName: 'Tester'
  });
  assert.strictEqual(reactiveRes.safe, false);
  assert.strictEqual(reactiveRes.status, 'DISCARDED');
});

// Test 6: Requisition, FEFO Matching, Reservation & Dispatch Flow
runTest('Requisition lifecycle transitions: PENDING -> APPROVED (Reserved) -> FULFILLED (Dispatched)', () => {
  // Create requisition
  const req = createRequisition({
    hospitalName: 'Test Memorial Hospital',
    patientName: 'Test Patient',
    patientId: 'TST-001',
    bloodGroup: 'B+',
    componentType: 'PRBC',
    unitsRequested: 1,
    urgency: 'CRITICAL',
    doctorName: 'Dr. Test'
  });
  assert.strictEqual(req.status, 'PENDING');

  // Check matching units
  const match = findCompatibleUnitsForRequest(req.id);
  assert.ok(match.canFulfill, 'Should be able to fulfill B+ request from inventory');
  assert.ok(match.matchingUnits.length >= 1);

  // Approve
  const approveRes = approveRequisition(req.id, [match.matchingUnits[0].id]);
  assert.strictEqual(approveRes.success, true);

  // Dispatch
  const dispatchRes = dispatchRequisition(req.id);
  assert.strictEqual(dispatchRes.success, true);
  assert.strictEqual(dispatchRes.fulfilledUnits, 1);
});

console.log(`\n🎉 All ${passedTests} unit tests passed successfully!\n`);
