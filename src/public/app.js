/**
 * Blood Bank Management System (BBMS) - Client Application
 * Team T9 (Sl. No. 9) - PES University
 */

// Active demo user state
let currentUser = {
  role: 'ADMIN',
  email: 'admin@bloodbank.org',
  fullName: 'Dr. Rajesh Sharma (Director)'
};

let currentTab = 'public';
let currentPendingMatchingUnits = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  // Set default intake date to today
  const today = new Date().toISOString().split('T')[0];
  const intakeDateInput = document.getElementById('intake-date');
  if (intakeDateInput) intakeDateInput.value = today;

  // Set random barcode for new intake
  generateRandomBarcode();

  // Load initial data
  refreshData();
});

function generateRandomBarcode() {
  const rand = Math.floor(100 + Math.random() * 900);
  const el = document.getElementById('intake-barcode');
  if (el) el.value = `BLD-2026-${rand}`;
}

// Tab switcher
function switchTab(tabId) {
  currentTab = tabId;
  const tabs = ['public', 'staff', 'hospital', 'donor'];
  
  tabs.forEach(t => {
    const view = document.getElementById(`view-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (view) {
      if (t === tabId) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    }
    if (btn) {
      if (t === tabId) {
        btn.className = 'px-3 py-2 rounded-lg text-sm font-medium bg-red-800 text-white transition';
      } else {
        btn.className = 'px-3 py-2 rounded-lg text-sm font-medium text-red-100 hover:bg-red-800 hover:text-white transition';
      }
    }
  });

  refreshData();
}

// Role quick switcher
function openRoleSwitcherModal() {
  openModal('modal-role-switcher');
}

function selectDemoRole(role) {
  if (role === 'ADMIN') {
    currentUser = { role: 'ADMIN', email: 'admin@bloodbank.org', fullName: 'Dr. Rajesh Sharma (Director)' };
    switchTab('public');
  } else if (role === 'STAFF') {
    currentUser = { role: 'STAFF', email: 'staff@bloodbank.org', fullName: 'Pooja Hegde (Sr. Lab Tech)' };
    switchTab('staff');
  } else if (role === 'HOSPITAL') {
    currentUser = { role: 'HOSPITAL', email: 'manipal@hospital.org', fullName: 'Manipal Hospital Bengaluru' };
    switchTab('hospital');
  } else if (role === 'DONOR') {
    currentUser = { role: 'DONOR', email: 'rohit.sharma@gmail.com', fullName: 'Rohit Sharma' };
    switchTab('donor');
  }

  document.getElementById('user-name').innerText = currentUser.fullName;
  document.getElementById('user-role').innerText = currentUser.role;
  closeModal('modal-role-switcher');
}

// Modal helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

// Refresh all live datasets
async function refreshData() {
  await Promise.all([
    loadDashboardKPIs(),
    loadInventoryMatrix(),
    loadCamps(),
    loadTestingQueue(),
    loadRequisitions(),
    loadDonors(),
    loadAllInventoryUnits()
  ]);
}

// 1. Dashboard KPIs & Low Stock Alerts
async function loadDashboardKPIs() {
  try {
    const res = await fetch('/api/analytics/dashboard');
    const data = await res.json();

    document.getElementById('kpi-available-units').innerText = data.totalAvailableBags;
    document.getElementById('kpi-pending-requests').innerText = data.pendingRequests;
    document.getElementById('kpi-total-donors').innerText = data.totalDonors;
    document.getElementById('kpi-upcoming-camps').innerText = data.upcomingCamps;

    // Alert Banner
    const banner = document.getElementById('alert-banner');
    if (data.lowStockAlerts && data.lowStockAlerts.length > 0) {
      const groups = data.lowStockAlerts.map(a => `${a.bloodGroup} (${a.currentStock} units)`).join(', ');
      banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1 text-amber-600"></i> <strong>Low Stock Notice:</strong> Blood inventory critically low for: <strong>${groups}</strong>. Automated emergency donor broadcast enabled.`;
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error loading KPIs', err);
  }
}

// 2. Inventory Availability Grid
async function loadInventoryMatrix() {
  try {
    const res = await fetch('/api/inventory/summary');
    const matrix = await res.json();

    const tbody = document.getElementById('public-matrix-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const g of groups) {
      const row = matrix[g] || { WHOLE_BLOOD: 0, PRBC: 0, PLATELETS: 0, FFP: 0, TOTAL: 0 };
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50';

      const isLow = row.TOTAL < 5;
      const totalBadge = isLow 
        ? `<span class="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">${row.TOTAL} (Low)</span>`
        : `<span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">${row.TOTAL} Units</span>`;

      tr.innerHTML = `
        <td class="p-3 text-left font-bold text-gray-900 flex items-center space-x-2">
          <span class="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-black">${g}</span>
        </td>
        <td class="p-3">${row.PRBC}</td>
        <td class="p-3">${row.WHOLE_BLOOD}</td>
        <td class="p-3">${row.PLATELETS}</td>
        <td class="p-3">${row.FFP}</td>
        <td class="p-3 font-bold bg-gray-50/50">${totalBadge}</td>
      `;
      tbody.appendChild(tr);
    }
  } catch (err) {
    console.error('Error loading matrix', err);
  }
}

// 3. Public Search
async function performPublicSearch() {
  const group = document.getElementById('search-blood-group').value;
  const comp = document.getElementById('search-component').value;

  try {
    const res = await fetch('/api/inventory/units?status=AVAILABLE');
    const units = await res.json();

    const filtered = units.filter(u => {
      const matchGroup = (group === 'ALL' || u.blood_group === group);
      const matchComp = (comp === 'ALL' || u.component_type === comp);
      return matchGroup && matchComp;
    });

    const box = document.getElementById('search-results-box');
    const badge = document.getElementById('search-count-badge');
    const tbody = document.getElementById('search-results-table');
    box.classList.remove('hidden');
    badge.innerText = `${filtered.length} units available`;

    tbody.innerHTML = '';
    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">No matching blood bags currently in stock. Submit an urgent hospital request for donor dispatch.</td></tr>`;
      return;
    }

    filtered.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3 font-mono font-bold text-gray-900">${u.barcode_id}</td>
        <td class="p-3"><span class="font-bold text-red-600">${u.blood_group}</span></td>
        <td class="p-3">${u.component_type}</td>
        <td class="p-3">${u.volume_ml} mL</td>
        <td class="p-3 font-mono text-xs">${u.expiry_date}</td>
        <td class="p-3 text-xs text-gray-500">${u.storage_rack}</td>
        <td class="p-3"><span class="status-badge badge-available">AVAILABLE</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error during search', err);
  }
}

// 4. Camps
async function loadCamps() {
  try {
    const res = await fetch('/api/camps');
    const camps = await res.json();
    const container = document.getElementById('camps-list-container');
    if (!container) return;
    container.innerHTML = '';

    camps.forEach(c => {
      const card = document.createElement('div');
      card.className = 'border border-gray-200 p-4 rounded-xl bg-gray-50 hover:bg-white transition flex flex-col justify-between';
      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-bold text-gray-900 text-sm">${c.camp_name}</h4>
            <span class="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">${c.rsvp_count} RSVPs</span>
          </div>
          <p class="text-xs text-gray-600 mb-2"><i class="fa-solid fa-location-dot text-red-500 mr-1.5"></i>${c.venue}</p>
          <div class="text-xs text-gray-500 space-y-1 mb-3">
            <p><i class="fa-regular fa-calendar text-gray-400 mr-1.5"></i>${c.camp_date} &bull; ${c.start_time} - ${c.end_time}</p>
            <p><i class="fa-solid fa-phone text-gray-400 mr-1.5"></i>Organizer: ${c.organizer_name} (${c.organizer_phone})</p>
          </div>
        </div>
        <button onclick="rsvpCamp(${c.id}, '${c.camp_name.replace(/'/g, "\\'")}')" class="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition">
          Pre-Register (RSVP)
        </button>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading camps', err);
  }
}

async function rsvpCamp(campId, campName) {
  const donorName = prompt(`Enter your Full Name to RSVP for:\n"${campName}"`);
  if (!donorName) return;
  const donorPhone = prompt('Enter your contact phone number:');
  if (!donorPhone) return;
  const bloodGroup = prompt('Enter your Blood Group (e.g. O+, A-, B+):', 'O+');
  if (!bloodGroup) return;

  try {
    const res = await fetch(`/api/camps/${campId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ donorName, donorPhone, bloodGroup })
    });
    const data = await res.json();
    alert(data.message || 'RSVP successful!');
    refreshData();
  } catch (err) {
    alert('RSVP failed: ' + err.message);
  }
}

// 5. Staff Console: Serology Testing Queue
async function loadTestingQueue() {
  try {
    const res = await fetch('/api/inventory/units?status=TESTING');
    const units = await res.json();

    const badge = document.getElementById('testing-queue-badge');
    if (badge) badge.innerText = `${units.length} units in quarantine`;

    const tbody = document.getElementById('testing-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (units.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400">All collected units have completed serology screening. No bags currently in quarantine.</td></tr>`;
      return;
    }

    units.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-3 font-mono font-bold text-gray-900">${u.barcode_id}</td>
        <td class="p-3"><span class="font-bold text-red-600">${u.blood_group}</span></td>
        <td class="p-3">${u.component_type}</td>
        <td class="p-3 font-mono text-xs">${u.collection_date}</td>
        <td class="p-3 text-xs text-gray-500">${u.storage_rack}</td>
        <td class="p-3"><span class="status-badge badge-testing">QUARANTINED (TESTING)</span></td>
        <td class="p-3 text-right">
          <button onclick="openTestModal(${u.id}, '${u.barcode_id}')" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded shadow-sm transition">
            <i class="fa-solid fa-vial mr-1"></i> Enter Lab Results
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading testing queue', err);
  }
}

function openTestModal(unitId, barcode) {
  document.getElementById('modal-test-unit-id').value = unitId;
  document.getElementById('test-modal-barcode-display').innerText = `Blood Bag Barcode: ${barcode}`;
  openModal('modal-test-verification');
}

async function submitTestResults(allSafe) {
  const unitId = document.getElementById('modal-test-unit-id').value;
  const techName = document.getElementById('test-technician-name').value;

  const payload = {
    hiv: allSafe ? 'NEGATIVE' : 'POSITIVE',
    hbv: 'NEGATIVE',
    hcv: 'NEGATIVE',
    syphilis: 'NEGATIVE',
    malaria: 'NEGATIVE',
    technicianName: techName
  };

  try {
    const res = await fetch(`/api/inventory/tests/${unitId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    alert(data.message);
    closeModal('modal-test-verification');
    refreshData();
  } catch (err) {
    alert('Failed to update test results: ' + err.message);
  }
}

// 6. Blood Intake Modal
function openIntakeModal() {
  generateRandomBarcode();
  openModal('modal-intake');
}

async function submitIntake(e) {
  e.preventDefault();
  const barcodeId = document.getElementById('intake-barcode').value;
  const bloodGroup = document.getElementById('intake-group').value;
  const componentType = document.getElementById('intake-component').value;
  const volumeMl = document.getElementById('intake-volume').value;
  const collectionDate = document.getElementById('intake-date').value;
  const storageRack = document.getElementById('intake-rack').value;

  try {
    const res = await fetch('/api/inventory/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcodeId, bloodGroup, componentType, volumeMl, collectionDate, storageRack })
    });
    const data = await res.json();
    alert(data.message);
    closeModal('modal-intake');
    refreshData();
  } catch (err) {
    alert('Intake failed: ' + err.message);
  }
}

// 7. Hospital Requisitions & Cross-Matching
async function submitRequisition(e) {
  e.preventDefault();
  const hospitalName = document.getElementById('req-hospital-name').value;
  const patientName = document.getElementById('req-patient-name').value;
  const patientId = document.getElementById('req-patient-id').value;
  const bloodGroup = document.getElementById('req-blood-group').value;
  const componentType = document.getElementById('req-component').value;
  const unitsRequested = document.getElementById('req-units').value;
  const urgency = document.getElementById('req-urgency').value;
  const doctorName = document.getElementById('req-doctor-name').value;

  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalName, patientName, patientId, bloodGroup, componentType, unitsRequested, urgency, doctorName })
    });
    const data = await res.json();
    alert(data.message);
    document.getElementById('requisition-form').reset();
    refreshData();
  } catch (err) {
    alert('Failed to submit requisition: ' + err.message);
  }
}

async function loadRequisitions() {
  try {
    const res = await fetch('/api/requests');
    const requests = await res.json();

    // Pending count
    const pending = requests.filter(r => r.status === 'PENDING').length;
    const badge = document.getElementById('pending-req-badge');
    if (badge) badge.innerText = `${pending} Pending`;

    // Render Staff queue
    const staffTable = document.getElementById('staff-requisitions-table');
    if (staffTable) {
      staffTable.innerHTML = '';
      if (requests.length === 0) {
        staffTable.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-gray-400">No requisitions on record.</td></tr>`;
      } else {
        requests.forEach(r => {
          const tr = document.createElement('tr');
          const isPending = r.status === 'PENDING';
          const isApproved = r.status === 'APPROVED';

          let actionHtml = '';
          if (isPending) {
            actionHtml = `
              <button onclick="openCrossMatchModal(${r.id})" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded shadow-sm transition">
                <i class="fa-solid fa-code-compare mr-1"></i> Match & Approve
              </button>
            `;
          } else if (isApproved) {
            actionHtml = `
              <button onclick="dispatchRequisition(${r.id})" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm transition">
                <i class="fa-solid fa-truck mr-1"></i> Dispatch & Handover
              </button>
            `;
          } else {
            actionHtml = `<span class="text-xs text-gray-400 italic">Fulfilled</span>`;
          }

          tr.innerHTML = `
            <td class="p-3 font-mono font-bold text-gray-900">#REQ-${r.id}</td>
            <td class="p-3 text-xs font-semibold">${r.hospital_name}</td>
            <td class="p-3 text-xs">${r.patient_name} <span class="text-gray-400">(${r.patient_id})</span></td>
            <td class="p-3 font-bold text-red-600">${r.blood_group}</td>
            <td class="p-3 text-xs">${r.component_type}</td>
            <td class="p-3 font-bold">${r.units_requested}</td>
            <td class="p-3"><span class="status-badge urgency-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
            <td class="p-3"><span class="status-badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
            <td class="p-3 text-right">${actionHtml}</td>
          `;
          staffTable.appendChild(tr);
        });
      }
    }

    // Render Hospital tracker
    const hospTable = document.getElementById('hospital-req-table-body');
    if (hospTable) {
      hospTable.innerHTML = '';
      requests.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="p-3 font-mono font-bold text-gray-900">#REQ-${r.id}</td>
          <td class="p-3 font-semibold">${r.patient_name}</td>
          <td class="p-3 font-bold text-red-600">${r.blood_group} &bull; ${r.component_type}</td>
          <td class="p-3 font-bold">${r.units_requested} Bag(s)</td>
          <td class="p-3"><span class="status-badge urgency-${r.urgency.toLowerCase()}">${r.urgency}</span></td>
          <td class="p-3"><span class="status-badge badge-${r.status.toLowerCase()}">${r.status}</span></td>
          <td class="p-3 text-xs text-gray-500 font-mono">${r.created_at}</td>
        `;
        hospTable.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Error loading requisitions', err);
  }
}

async function openCrossMatchModal(reqId) {
  try {
    const res = await fetch(`/api/requests/${reqId}/match`);
    const data = await res.json();

    document.getElementById('match-modal-req-id').value = reqId;
    document.getElementById('match-modal-req-title').innerText = `Requisition #REQ-${reqId} for ${data.request.patient_name} (${data.request.blood_group} ${data.request.component_type})`;
    document.getElementById('match-modal-compat-info').innerText = `Recipient is ${data.request.blood_group}. Compatible donor groups according to clinical matrix: ${data.compatibleGroups.join(', ')}`;

    const list = document.getElementById('match-modal-units-list');
    list.innerHTML = '';

    currentPendingMatchingUnits = data.matchingUnits;

    if (data.matchingUnits.length === 0) {
      list.innerHTML = `<div class="p-3 bg-red-50 text-red-700 rounded text-xs">⚠️ No compatible available units in stock. Trigger an emergency donor broadcast.</div>`;
      document.getElementById('btn-confirm-approval').disabled = true;
    } else {
      document.getElementById('btn-confirm-approval').disabled = false;
      data.matchingUnits.forEach((u, idx) => {
        const div = document.createElement('div');
        div.className = 'p-2 bg-white border border-gray-200 rounded flex justify-between items-center text-xs';
        div.innerHTML = `
          <div>
            <span class="font-mono font-bold text-gray-900">${u.barcode_id}</span>
            <span class="ml-2 font-bold text-red-600">${u.blood_group}</span>
            <span class="ml-2 text-gray-500">${u.component_type}</span>
          </div>
          <div class="text-right">
            <span class="font-mono text-gray-600 text-[11px]">Expiry: ${u.expiry_date}</span>
            <span class="ml-2 text-xs bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">FEFO #${idx+1}</span>
          </div>
        `;
        list.appendChild(div);
      });
    }

    openModal('modal-req-match');
  } catch (err) {
    alert('Error running cross-match engine: ' + err.message);
  }
}

async function confirmRequisitionApproval() {
  const reqId = document.getElementById('match-modal-req-id').value;
  const unitIds = currentPendingMatchingUnits.map(u => u.id);

  try {
    const res = await fetch(`/api/requests/${reqId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unitIds })
    });
    const data = await res.json();
    alert(data.message);
    closeModal('modal-req-match');
    refreshData();
  } catch (err) {
    alert('Approval failed: ' + err.message);
  }
}

async function dispatchRequisition(reqId) {
  if (!confirm(`Confirm dispatch and physical bag handover for Requisition #REQ-${reqId}?`)) return;

  try {
    const res = await fetch(`/api/requests/${reqId}/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    alert(data.message);
    refreshData();
  } catch (err) {
    alert('Dispatch failed: ' + err.message);
  }
}

// 8. Donors & Cooldown Tracking
async function loadDonors() {
  try {
    const res = await fetch('/api/donors');
    const donors = await res.json();

    const tbody = document.getElementById('donors-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    donors.forEach(d => {
      const tr = document.createElement('tr');
      const isEligible = d.eligibility.eligible;
      const statusBadge = isEligible 
        ? `<span class="status-badge badge-available"><i class="fa-solid fa-check mr-1"></i> Eligible to Donate</span>`
        : `<span class="status-badge badge-testing"><i class="fa-solid fa-hourglass mr-1"></i> Cooldown (${d.eligibility.daysRemaining}d remaining)</span>`;

      tr.innerHTML = `
        <td class="p-3 font-semibold text-gray-900">${d.full_name || 'Anonymous Voluntary Donor'}</td>
        <td class="p-3 font-bold text-red-600">${d.blood_group}</td>
        <td class="p-3 font-mono text-xs">${d.phone || '+91-9845012345'}</td>
        <td class="p-3 text-xs">${d.weight_kg} kg &bull; ${d.hemoglobin} g/dL</td>
        <td class="p-3 font-mono text-xs">${d.last_donation_date || 'First-time donor'}</td>
        <td class="p-3">${statusBadge}</td>
      `;
      tbody.appendChild(tr);
    });

    // Update active donor profile card if available
    if (donors.length > 0) {
      const d1 = donors[0];
      const cardName = document.getElementById('donor-card-name');
      const cardGroup = document.getElementById('donor-card-group');
      const cardVitals = document.getElementById('donor-card-vitals');
      if (cardName) cardName.innerText = d1.full_name || 'Rohit Sharma';
      if (cardGroup) cardGroup.innerText = d1.blood_group;
      if (cardVitals) cardVitals.innerText = `${d1.weight_kg} kg • ${d1.hemoglobin} g/dL`;
    }
  } catch (err) {
    console.error('Error loading donors', err);
  }
}

async function registerNewDonor(e) {
  e.preventDefault();
  const fullName = document.getElementById('donor-reg-name').value;
  const phone = document.getElementById('donor-reg-phone').value;
  const bloodGroup = document.getElementById('donor-reg-group').value;
  const weightKg = document.getElementById('donor-reg-weight').value;
  const hemoglobin = document.getElementById('donor-reg-hb').value;
  const dateOfBirth = document.getElementById('donor-reg-dob').value;
  const lastDonationDate = document.getElementById('donor-reg-lastdate').value;

  try {
    const res = await fetch('/api/donors/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, bloodGroup, weightKg, hemoglobin, dateOfBirth, lastDonationDate })
    });
    const data = await res.json();
    alert('Donor registered! Eligibility check: ' + (data.donor.eligibility.eligible ? 'ELIGIBLE' : data.donor.eligibility.reason));
    refreshData();
  } catch (err) {
    alert('Registration failed: ' + err.message);
  }
}

async function filterShortageBroadcast() {
  try {
    const res = await fetch('/api/donors/broadcast/shortage?groups=O-,A-,B-');
    const donors = await res.json();
    alert(`📢 Emergency Shortage Broadcast Alert!\nSurfacing ${donors.length} active voluntary donors with matching rare blood types (O-, A-, B-) whose 90-day cooldown is satisfied.`);
  } catch (err) {
    alert('Broadcast failed: ' + err.message);
  }
}

// 9. All Inventory Units Ledger
async function loadAllInventoryUnits() {
  try {
    const res = await fetch('/api/inventory/units');
    const units = await res.json();

    const tbody = document.getElementById('all-units-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    units.forEach(u => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="p-2.5 font-bold text-gray-900">${u.barcode_id}</td>
        <td class="p-2.5 font-bold text-red-600">${u.blood_group}</td>
        <td class="p-2.5">${u.component_type}</td>
        <td class="p-2.5">${u.volume_ml} mL</td>
        <td class="p-2.5">${u.collection_date}</td>
        <td class="p-2.5">${u.expiry_date}</td>
        <td class="p-2.5 text-gray-500">${u.storage_rack}</td>
        <td class="p-2.5"><span class="status-badge badge-${u.status.toLowerCase()}">${u.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading all units', err);
  }
}
