const express = require('express');
const QRCode = require('qrcode');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage for call mappings (use database in production)
const callMappings = new Map();

// Exotel configuration
const EXOTEL_SID = process.env.EXOTEL_SID;
const EXOTEL_TOKEN = process.env.EXOTEL_TOKEN;
const EXOTEL_SUBDOMAIN = process.env.EXOTEL_SUBDOMAIN;
const FROM_NUMBER = process.env.FROM_NUMBER; // Your Exotel virtual number

// Check if Exotel credentials are configured
const isExotelConfigured = EXOTEL_SID && EXOTEL_TOKEN && FROM_NUMBER && 
  EXOTEL_SID !== 'your_exotel_sid_here' && 
  EXOTEL_TOKEN !== 'your_exotel_token_here' && 
  FROM_NUMBER !== 'your_exotel_virtual_number';

// Generate QR code for a phone number
app.post('/generate-qr', async (req, res) => {
  try {
    const { phoneNumber, label } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    // Validate phone number format (basic validation)
    if (!/^\+?[\d\s\-\(\)]+$/.test(phoneNumber)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }
    
    // Generate unique call ID
    const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Store mapping
    callMappings.set(callId, {
      phoneNumber,
      label: label || 'Unknown Contact',
      createdAt: new Date()
    });
    
    // Generate QR code with call ID (not phone number)
    const qrData = `${req.protocol}://${req.get('host')}/call/${callId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    
    res.json({
      success: true,
      callId,
      qrCode: qrCodeDataURL,
      callUrl: qrData,
      label
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Handle QR code scan and initiate call
app.get('/call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    const { from } = req.query; // Caller's number from query param
    
    if (!callMappings.has(callId)) {
      return res.status(404).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid or Expired QR Code</h2>
            <p>This QR code is not valid or has expired.</p>
          </body>
        </html>
      `);
    }
    
    const mapping = callMappings.get(callId);
    
    // If no 'from' number provided, show input form
    if (!from) {
      return res.send(`
        <html>
          <head>
            <title>Make Call</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
              .form-group { margin: 20px 0; }
              input { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 5px; }
              button { width: 100%; padding: 15px; font-size: 18px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
              button:hover { background: #0056b3; }
              .contact-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="contact-info">
              <h3>📞 Calling: ${mapping.label}</h3>
              <p><small>Generated: ${mapping.createdAt.toLocaleString()}</small></p>
            </div>
            
            <form action="/call/${callId}" method="get">
              <div class="form-group">
                <label>Your Phone Number:</label>
                <input type="tel" name="from" placeholder="+1234567890" required>
              </div>
              <button type="submit">📞 Make Call</button>
            </form>
          </body>
        </html>
      `);
    }
    
    // Check if Exotel is configured
    if (!isExotelConfigured) {
      return res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>⚠️ Demo Mode</h2>
            <p>Exotel credentials not configured.</p>
            <p>Would call <strong>${mapping.label}</strong> from <strong>${from}</strong></p>
            <p><small>Configure your .env file to enable actual calling</small></p>
          </body>
        </html>
      `);
    }
    
    // Initiate call via Exotel
    const callResult = await initiateExotelCall(from, mapping.phoneNumber);
    
    if (callResult.success) {
      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Call Initiated!</h2>
            <p>Calling <strong>${mapping.label}</strong></p>
            <p>You should receive a call shortly on <strong>${from}</strong></p>
            <p><small>Call ID: ${callResult.callSid}</small></p>
          </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Call Failed</h2>
            <p>Unable to initiate call. Please try again.</p>
            <p><small>Error: ${callResult.error}</small></p>
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('Error handling call:', error);
    res.status(500).send('Internal server error');
  }
});

// Function to initiate Exotel call
async function initiateExotelCall(fromNumber, toNumber) {
  try {
    const url = `https://${EXOTEL_SID}:${EXOTEL_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`;
    
    // Create form data for Exotel API
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', toNumber);
    formData.append('CallerId', FROM_NUMBER);
    formData.append('CallType', 'trans');
    
    const response = await axios.post(url, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return {
      success: true,
      callSid: response.data.Call.Sid,
      status: response.data.Call.Status
    };
    
  } catch (error) {
    console.error('Exotel API error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

// Get all call mappings (for admin/testing)
app.get('/admin/mappings', (req, res) => {
  const mappings = Array.from(callMappings.entries()).map(([id, data]) => ({
    id,
    ...data,
    phoneNumber: data.phoneNumber.replace(/\d(?=\d{4})/g, '*') // Mask phone number
  }));
  
  res.json(mappings);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Generate QR codes at http://localhost:${PORT}`);
});