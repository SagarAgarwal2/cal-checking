# Exotel QR Caller

A secure QR code-based phone calling system using Exotel API. Users can scan QR codes to make calls without seeing the actual phone numbers.

## Features

- 🔒 **Privacy**: Phone numbers are hidden behind unique call IDs
- 📱 **QR Code Generation**: Create scannable QR codes for any phone number
- ☎️ **Exotel Integration**: Uses Exotel API for reliable call routing
- 🌐 **Web Interface**: Simple web app for generating and managing QR codes
- 📊 **Call Tracking**: Track generated QR codes and their usage

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Exotel credentials:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Exotel credentials:
   ```
   EXOTEL_SID=your_exotel_sid_here
   EXOTEL_TOKEN=your_exotel_token_here
   EXOTEL_SUBDOMAIN=your_subdomain_here
   FROM_NUMBER=your_exotel_virtual_number
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   For development:
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   ```
   http://localhost:3000
   ```

## How It Works

1. **Generate QR Code**: Enter a phone number and optional label
2. **Share QR Code**: The generated QR contains a unique call ID, not the phone number
3. **Scan & Call**: Users scan the QR, enter their number, and get connected via Exotel
4. **Privacy Maintained**: The actual phone number is never exposed to callers

## API Endpoints

### POST /generate-qr
Generate a QR code for a phone number.

**Request:**
```json
{
  "phoneNumber": "+1234567890",
  "label": "Customer Support"
}
```

**Response:**
```json
{
  "success": true,
  "callId": "call_1234567890_abc123",
  "qrCode": "data:image/png;base64,...",
  "callUrl": "http://localhost:3000/call/call_1234567890_abc123",
  "label": "Customer Support"
}
```

### GET /call/:callId
Handle QR code scan and initiate call.

**Query Parameters:**
- `from`: Caller's phone number (optional, will show form if not provided)

### GET /admin/mappings
View all generated call mappings (phone numbers are masked).

## Exotel Configuration

Make sure you have:
- An active Exotel account
- A virtual phone number from Exotel
- API credentials (SID and Token)

## Security Notes

- Phone numbers are stored in memory (use a database for production)
- Call IDs are unique and time-based
- Actual phone numbers are never exposed in QR codes
- Consider adding authentication for admin endpoints in production

## Production Deployment

For production use:
1. Use a proper database instead of in-memory storage
2. Add authentication and authorization
3. Implement rate limiting
4. Add HTTPS/SSL
5. Set up proper logging and monitoring
6. Consider call ID expiration policies