# QR Code Calling Demo Flow

## Scenario: Person A wants Person B to call them without sharing their phone number

### Step 1: Person A (Phone Owner) - Generate QR Code
1. Go to: `http://10.89.131.146:3000` (or localhost:3000 on computer)
2. Enter their phone number: `+1234567890` (Person A's real number)
3. Enter label: `Call Me - John`
4. Click "Generate QR Code"
5. **Result**: QR code is generated with a secret call ID (NOT the phone number)

### Step 2: Person A shares the QR Code
- Person A shows/sends the QR code to Person B
- The QR code contains: `http://10.89.131.146:3000/call/call_xxxxx` (secret ID)
- Person B **CANNOT see** the actual phone number `+1234567890`

### Step 3: Person B (Caller) - Scan & Call
1. Person B scans the QR code with their phone
2. Browser opens: `http://10.89.131.146:3000/call/call_xxxxx`
3. Page shows: "Calling: Call Me - John" (label only, no phone number)
4. Person B enters THEIR phone number: `+0987654321`
5. Clicks "Make Call"

### Step 4: Exotel Connects the Call
- Exotel calls Person B at `+0987654321`
- When Person B answers, Exotel connects them to Person A at `+1234567890`
- **Privacy maintained**: Person B never saw Person A's actual number!

## Current Status: ✅ WORKING
- QR Generation: ✅ Working
- Privacy Protection: ✅ Phone numbers hidden
- Mobile Access: ✅ Fixed (accessible from phone)
- Demo Mode: ✅ Shows flow without real calls (until Exotel configured)

## To Enable Real Calls:
Add your Exotel credentials to `.env` file