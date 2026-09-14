# Blood Bank Management System (BBMS)
## Software Engineering Mini-Project — PES University

> 🌐 **Live Website (Public 24/7)**: [https://rendered-undo-bee-plot.trycloudflare.com](https://rendered-undo-bee-plot.trycloudflare.com)  
> 📥 **Official Submission PDF (19 Pages)**: [Download SRS PDF](docs/SRS_Blood_Bank_Management_System.pdf) &bull; [Live Direct PDF](https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Blood_Bank_Management_System.pdf)  
> 📄 **Live Interactive HTML Thesis Report**: [https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Report.html](https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Report.html)  
> 🚀 **1-Click Render Cloud Deploy**: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Navaneeth1324/blood-bank-management-system)

---

### Project Metadata
- **Course**: Software Engineering (UE24CS---) Mini-Project
- **Team Number**: **T9**
- **Project Allocation Sl. No.**: **9**
- **Title**: Blood Bank Management System
- **Description**: A comprehensive web-based logistics and transfusion medicine system to manage voluntary blood donation, clinical serology testing, inventory shelf-life tracking, and emergency hospital requisitions with automated ABO/Rh compatibility matching.
- **Technology Stack**: JavaScript (Node.js LTS, Express.js 5.x, SQLite embedded via `node:sqlite`, Tailwind CSS).

### Team T9 Members & Work Breakdown Structure (4-Way Module Split)

| Student Name & Role | SRN & GitHub Profile | Assigned Project Module | Primary Responsibilities & Source Code |
| :--- | :--- | :--- | :--- |
| **Uttam**<br/>(Team Member 1) | `PES1UG24CS697`<br/>([@Uttam1916](https://github.com/Uttam1916)) | **Module 1: Architecture, Security & RBAC** | `src/config/database.js`, `src/services/authService.js`, `src/routes/authRoutes.js`<br/>• Relational schema design & SQLite migrations<br/>• PBKDF2 password hashing & token authentication<br/>• SRS System Architecture & DFD Levels 0 & 1 |
| **Abhinav K**<br/>(Team Member 2) | `PES1UG24CS701`<br/>([@Abhinavk0006](https://github.com/Abhinavk0006)) | **Module 2: Donor Management & Camps** | `src/services/donorService.js`, `src/services/campService.js`, `src/routes/donorRoutes.js`, `src/routes/campRoutes.js`<br/>• 90-day biological cooldown algorithm & screening checks<br/>• Blood donation camp drive scheduling & RSVP system<br/>• SRS Donor Use Cases & Sequence Diagram |
| **Akshay Arcot**<br/>(Team Member 3) | `PES1UG24CS705`<br/>([@Akshayarcot](https://github.com/Akshayarcot)) | **Module 3: Inventory & Serology Lab Testing** | `src/services/inventoryService.js`, `src/routes/inventoryRoutes.js`, `src/routes/analyticsRoutes.js`<br/>• Blood bag barcode intake & shelf-life calculation<br/>• 5-point TTI serological screening gate (HIV, HBV, HCV, Syphilis, Malaria)<br/>• SRS Entity-Relationship Diagram & Data Dictionary |
| **Navaneeth Tanuboddi**<br/>(Team Member 4 — Lead) | `PES1UG24CS709`<br/>([@Navaneeth1324](https://github.com/Navaneeth1324)) | **Module 4: ABO Compatibility Engine & UI** | `src/services/matchingEngine.js`, `src/services/requisitionService.js`, `src/routes/requisitionRoutes.js`, `src/public/*`<br/>• Clinical ABO/Rh cross-matching & FEFO allocation engine<br/>• Hospital emergency requisition lifecycle & UI dashboard<br/>• Automated unit test suite & Cloud deployment |

---

## Key Features & Modules

1. **Academic IEEE 830-Compliant SRS Document**:
   - Complete formal specification with 8 functional modules, non-functional requirements, data dictionary, and **9 Mermaid UML & Architectural diagrams** (Use Case, DFD Levels 0/1/2, ERD, Sequence Diagrams, State Transition, and Architecture).
   - Printable HTML thesis report with embedded interactive diagram rendering.

2. **Role-Based Access Control (RBAC)**:
   - 🛡️ **System Administrator**: Overall inventory metrics, shortage broadcast alerts, camp coordination.
   - 🔬 **Blood Bank Staff / Lab Technician**: Barcoded bag intake, 5-point serological TTI test logging (HIV, HBV, HCV, Syphilis, Malaria), requisition approval.
   - 🏥 **Hospital Representative**: Patient blood requisition submission, urgency triage (`ROUTINE`, `URGENT`, `CRITICAL`), real-time fulfillment tracker.
   - ❤️ **Voluntary Donor**: Digital donor pass, 90-day biological cooldown countdown meter, camp RSVP.

3. **Clinical Cross-Matching Engine (ABO & Rh Compatibility)**:
   - Full automated compliance with clinical transfusion rules for both red cells (PRBC/Whole Blood) and plasma (FFP/Platelets).
   - **First-Expired-First-Out (FEFO)**: Automatically prioritizes compatible units closest to expiration date to minimize biological waste.

4. **Donor Safety & Screening Gate**:
   - Enforces minimum donor weight ($\ge 45\text{ kg}$) and hemoglobin ($\ge 12.5\text{ g/dL}$).
   - Enforces strict 90-day minimum interval between successive blood donations.

---

## Live Access & Quick Demo

> You can access the live, fully functional application immediately without any setup:
> - 🌐 **Live Web Application**: [https://rendered-undo-bee-plot.trycloudflare.com](https://rendered-undo-bee-plot.trycloudflare.com)
> - 📄 **Live SRS Document (HTML Interactive Report)**: [https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Report.html](https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Report.html)
> - 📥 **Download SRS Word Document (.docx)**: [https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Blood_Bank_Management_System.docx](https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Blood_Bank_Management_System.docx)
> - 📕 **Download SRS PDF Report**: [https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Blood_Bank_Management_System.pdf](https://rendered-undo-bee-plot.trycloudflare.com/docs/SRS_Blood_Bank_Management_System.pdf)

---

## Local Development & Offline Setup

### Prerequisites
- Node.js (v18 or higher; Node.js v22/24 recommended with zero-setup built-in SQLite).

### Steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/Navaneeth1324/blood-bank-management-system.git
   cd blood-bank-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Seed the database with clinical demo data:
   ```bash
   npm run seed
   ```

4. Run the automated unit test suite:
   ```bash
   npm test
   ```

5. Launch the local web server:
   ```bash
   npm start
   ```
   Open your browser at:
   - **Local Web App**: `http://localhost:3000`
   - **Local SRS Document**: `http://localhost:3000/docs/SRS_Report.html`

---

## Default Login & Demo Credentials

| Role | Email | Password | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bloodbank.org` | `admin123` | System oversight & shortage alerts |
| **Lab Staff** | `staff@bloodbank.org` | `staff123` | Bag intake, TTI serology, FEFO approvals |
| **Hospital** | `manipal@hospital.org` | `hospital123` | Requisitions & patient allocation tracker |
| **Donor** | `rohit.sharma@gmail.com` | `donor123` | Digital donor pass & cooldown meter |

*(Note: The web app includes a built-in one-click role switcher in the top navigation bar for viva demonstrations).*

---

## Directory Structure
```
blood-bank-management-system/
├── README.md                                 # Project documentation & run guide
├── package.json                              # Node.js dependencies & scripts
├── data/
│   └── blood_bank.db                         # Embedded SQLite database
├── docs/
│   ├── SRS_Blood_Bank_Management_System.md   # Complete IEEE 830 SRS Document
│   └── SRS_Report.html                       # Printable thesis viewer with Mermaid diagrams
└── src/
    ├── server.js                             # Express application server
    ├── seed.js                               # Clinical sample seed script
    ├── test.js                               # Automated verification test suite
    ├── config/
    │   └── database.js                       # SQLite relational schema & migrations
    ├── services/
    │   ├── authService.js                    # PBKDF2 cryptography & RBAC sessions
    │   ├── donorService.js                   # 90-day cooldown & donor profiling
    │   ├── inventoryService.js               # Expiry tracking & TTI serology testing
    │   ├── matchingEngine.js                 # ABO/Rh compatibility matrix & FEFO logic
    │   ├── requisitionService.js             # Hospital orders, allocation & dispatch
    │   └── campService.js                    # Blood drives & emergency alerts
    ├── routes/
    │   ├── authRoutes.js
    │   ├── donorRoutes.js
    │   ├── inventoryRoutes.js
    │   ├── requisitionRoutes.js
    │   ├── campRoutes.js
    │   └── analyticsRoutes.js
    └── public/
        ├── index.html                        # Modern SPA UI with Tailwind CSS
        └── app.js                            # Frontend client logic & modals
```

---

## Academic Evaluation / Viva Guide

### 1. What makes your ABO/Rh matching engine clinically sound?
> Our system separates red blood cell compatibility from plasma compatibility. Red cells follow antigen-antibody agglutination rules (e.g., $O^-$ is universal donor, $AB^+$ is universal recipient). Conversely, plasma (FFP) compatibility is inverted (i.e., $AB^+$ is universal plasma donor and $O^-$ is universal plasma recipient). Furthermore, our allocation engine enforces **FEFO (First-Expired-First-Out)** to dispatch compatible units closest to expiry first.

### 2. How is biological safety maintained in the database?
> Blood bags are initially created with status `TESTING` (quarantined). They are shielded by a database check constraint and API guard: under no circumstances can a quarantined or expired unit be allocated to an order. Only when an authorized technician logs negative results across all 5 mandatory TTI markers (HIV, HBV, HCV, Syphilis, Malaria) is the status transitioned to `AVAILABLE`.

### 3. How does the system handle donor health and cooldown?
> The system tracks donor vitals (requiring weight $\ge 45\text{ kg}$ and hemoglobin $\ge 12.5\text{ g/dL}$) and computes date difference since the previous whole blood donation. If $< 90\text{ days}$ have elapsed, the application rejects the donation attempt and dynamically informs the donor of their exact remaining cooldown days.
