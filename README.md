# ORCHESTRA Client: Faculty Telemetry Matrix & Ingress Portal

**Orchestrated RFID Classroom Attendance Framework with Hardware-Enforced Session Trust and Roster Automation**  
*College of Computer Studies — Department of Computer Science & Information Technology*  
*Authors: Agbada, Altichie, Cabunoc, Dalupang, Macadat, Malate (October 2026)*

---

## Architectural & Design Overview

- **Design Archetype**: **Terminal / HUD (Industrial Telemetry Console)** — purpose-built for mission-critical hardware ingress, high-density tabular legibility, and architectural precision.
- **Palette**: Obsidian canvas (`#080A0D`), gunmetal surface cards (`#0D1117`), precision hairlines (`#1E2632`), with surgical Phosphor Lime (`#CCFF00`), Warning Amber (`#F59E0B`), and Lockout Crimson (`#EF4444`).
- **Typography**: Structural headers in **Space Grotesk** paired with high-precision tabular registers in **JetBrains Mono**.
- **Layout**: Asymmetric 70/30 split (70% live roster ledger, 30% calibration controls & security diagnostics).

---

## Key Modules & Features

### 1. Faculty Live Session Matrix
- Real-time Socket.io listener updating immediately upon card taps, session toggles, and threshold recalibrations.
- 6-metric telemetry strip (Enrolled, Present, Late, Cut, Excused, Absent) with live percentage efficiency and headcount progress bar.
- Interactive punctuality calibration engine with a dynamic 0–60m time-bracket diagram.
- Faculty manual status override modal with clinic/official remark logging.
- 1-click downloads for compiled official PDF rosters and CSV spreadsheets.

### 2. Student Keypad OTP Ingress Portal
- Ephemeral 60-second time-decaying 6-digit PIN generator for students who forgot physical RFID tags.
- Physical 4x4 matrix keypad instruction guide.

### 3. Edge Terminal Diagnostics & OLED Mirror
- Pixel-mapped SSD1306 0.96" 128x64 graphic OLED display mirror reflecting real-time door terminal state.
- Hardware RFID card simulation controls (Faculty master badge `0xA1B2C3D4`, student cards, foreign unregistered tags).
- 3.0-second non-blocking Firmware Pacing Interlock visualizer.
- Live UART 115200 baud bus telemetry stream.

---

## Setup & Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Vite Development Server**:
   ```bash
   npm run dev
   ```
   The client will be accessible at `http://localhost:5173`.

3. **Compile Production Bundle**:
   ```bash
   npm run build
   ```
