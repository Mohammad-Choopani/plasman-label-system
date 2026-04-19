# Current Status

## Current Date
2026-04-17

## Project Status
In progress

## What Has Been Completed

### Project Structure
Root folders created:
- api
- web
- docs

### Backend Setup
Backend stack initialized:
- Express
- TypeScript
- CORS
- dotenv
- zod

Current backend files created:
- src/index.ts
- src/routes/auth.routes.ts
- src/routes/station.routes.ts
- src/controllers/auth.controller.ts
- src/controllers/station.controller.ts
- src/data/mockData.ts

### Backend APIs Working
Verified:
- /api/health
- /api/station/config
- /api/station/lineup

### Frontend Setup
Frontend stack initialized:
- Vite
- React
- TypeScript
- axios

### Frontend UI Built
These screens exist in frontend:
- Login Screen
- Part Menu
- Main HMI Screen

### Frontend Flow Confirmed
Current confirmed UI flow:
1. Login
2. Part Menu
3. Display Part loads line-up inside the white box
4. User highlights a part
5. Select Part opens HMI directly
6. Change Part returns to Part Menu
7. Log Out returns to Login

## Important Confirmed Business Logic

### Login
- Station ID is fixed
- Employee ID is manual
- Crew Size must be selectable from 1 to 15

### Part Menu
- Display Part shows line-up inside same white box
- Select Part directly loads HMI
- OK is not part of final flow

### Production Logic
- Swipe device exists
- Swipe triggers barcode generation
- Barcode must be scanned
- If barcode is not scanned, next part must not be accepted
- Duplicate barcode must fail
- Final label only after valid accepted count reaches pack target

### Shift Change
- Shift Change must print a barcode label
- Next shift scans the barcode
- Packed count continues from previous shift

### HMI
Still needs real logic for:
- Target quantity
- Current accepted count
- Packed list items in black text
- Scan status indicator color
- Shift handoff state

## Current Tech Notes

### Backend
Backend is running on:
- http://localhost:4000

### Frontend
Frontend is running locally in Vite dev mode

### Current API Status
Working:
- health
- station config
- station lineup

Not yet connected:
- frontend login to backend
- frontend lineup to backend
- hmi live state to backend

## What Must Be Done Next

### Immediate Next Step
Connect frontend login screen to backend login API.

### After That
1. Create auth login API response flow in frontend
2. Load station config from backend
3. Load lineup from backend
4. Remove hardcoded lineup from App.tsx
5. Add HMI live state model
6. Add swipe/barcode/scan logic
7. Add count progress and target quantity
8. Add shift change label logic
9. Add database persistence
10. Add PWA manifest, icons, and Vercel deployment

## Current Risks / Missing Items
- No database yet
- No real persistence yet
- No real barcode generation yet
- No real scanner integration yet
- No real shift change persistence yet
- No real mobile PWA config yet

## Core Reminder
Do not lose the confirmed business flow:
Login -> Part Menu -> Display Part -> Highlight Part -> Select Part -> HMI -> Swipe -> Barcode -> Scan -> Count -> Label