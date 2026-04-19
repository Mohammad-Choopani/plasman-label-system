# Plasman Label System - Project Brain

## Project Name
Plasman Label System

## Main Goal
Build a station-based industrial HMI/PWA system for part selection, barcode flow, scan validation, count tracking, shift handoff, and final label generation.

## Core Business Understanding

### 1. No Camera
This system does not use a camera.

### 2. Available Devices
- Barcode printer
- Label printer
- Scanner
- Swipe / finger / confirmation device
- HMI touch screen

### 3. Main Workflow
1. Operator logs in
2. Operator opens Part Menu
3. Display Part loads line-up inside the large white box
4. Operator highlights a part from the line-up
5. Select Part loads the main HMI directly
6. HMI shows full part details
7. Operator completes a part
8. Operator uses the swipe device
9. System generates a unique barcode
10. Barcode must be scanned
11. If barcode scan is valid, the part is accepted
12. Accepted part is added to count and packed progress
13. If barcode is not scanned, next part must not be accepted
14. If barcode is duplicated, system must show error
15. When accepted count reaches pack target, final label is generated

## Critical Rules

### Barcode Rules
- Every barcode must be unique
- Duplicate barcode must raise error
- No scan = no accepted part
- No accepted part = no count increase
- No full valid count = no final label

### Part Completion Rule
A part is only complete after barcode scan confirmation.

### Next Part Interlock
If the previous barcode was not scanned successfully, the next part must not be accepted.

### Label Rule
The final label is only allowed when valid accepted count reaches the required pack quantity.

## Shift Change Logic
When operator presses Shift Change:
- System must generate a shift handoff label
- That label contains a barcode
- Next shift scans that barcode
- After scanning, next shift can see the already packed quantity
- Packed count continues from the previous shift, not from zero

## HMI UI Rules

### Login Screen
Fields:
- Station ID
- Employee ID
- Crew Size

Crew Size:
- Must be selectable from 1 to 15
- Touch-friendly

Buttons:
- Log In
- Log Out
- Exit

### Part Menu
Contains:
- Large white box
- Display Part button
- Select Part button
- Exit button

Rules:
- Display Part loads the line-up inside the same white box
- Selecting a line-up item highlights it
- Select Part directly opens the HMI
- OK is not part of the final flow

### Main HMI
Must show:
- Full selected part information
- Internal part number
- Description
- Customer part number
- AR number
- Position
- Colour
- Fixture ID
- Standard pack
- Alternative pack

Main actions:
- Print Partial
- Shift Change
- Down Time
- Suspect / Defect
- Options
- Change Part

### Production Box Logic
The production area must later show:
- Target quantity for the current order
- Current accepted count
- Packed list of accepted parts
- Progress like current / target
- Black text list of accepted parts under the box

### Scan Indicator Box
Small production status box behavior:
- Idle: neutral
- Waiting scan: pending state
- Scan success: green
- Scan error or duplicate: error state

## Architecture Plan

### Frontend
- React
- Vite
- TypeScript
- Touch-first UI
- PWA-ready

### Backend
- Node.js
- Express
- TypeScript

### Database
- PostgreSQL later
- Mock data first
- Real persistence later

## Planned Backend Entities

### users
- id
- employeeId
- role
- active

### stations
- id
- stationId
- hmiTitle
- version
- active

### sessions
- id
- stationId
- employeeId
- crewSize
- startedAt
- endedAt

### lineups
- id
- stationId
- active
- createdAt

### lineup_parts
- id
- lineupId
- partId
- orderIndex

### parts
- id
- internalPartNumber
- description
- customerPartNumber
- arNumber
- position
- colour
- fixtureId
- stdPack
- altPack

### station_state
- stationId
- currentPartId
- currentTargetQty
- currentAcceptedCount
- currentContainerId
- scanStatus
- activeShift

### swipe_events
- id
- stationId
- employeeId
- partId
- createdAt

### barcode_events
- id
- stationId
- partId
- barcodeValue
- generatedAt
- scannedAt
- scanStatus
- isDuplicate

### packed_items
- id
- stationId
- partId
- barcodeValue
- acceptedAt
- containerId

### shift_handoffs
- id
- stationId
- barcodeValue
- previousShift
- nextShift
- carriedCount
- createdAt

### label_jobs
- id
- stationId
- containerId
- labelType
- printedAt
- printerName
- status

## Immediate Development Direction
1. Finalize frontend flow
2. Connect login to backend
3. Load lineup from backend
4. Replace local mock state with API data
5. Add HMI live state
6. Add swipe -> barcode -> scan state logic
7. Add count progress
8. Add shift change barcode logic
9. Add database
10. Add PWA and deployment

## PWA Direction
Target:
- Installable on mobile
- Add to Home Screen
- Vercel deployment
- App-like fullscreen behavior
- Touch-first interaction

## Important Reminder
This project is not just a label page.
It is a station-based production confirmation and packaging system with barcode validation and shift handoff logic.