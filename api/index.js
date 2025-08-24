const QRCode = require('qrcode');
const axios = require('axios');

// Simple in-memory storage (use database in production)
const callMappings = new Map();

// Exotel configuration
const EXOTEL_SID = process.env.EXOTEL_SID;
const EXOTEL_TOKEN = process.env.EXOTEL_TOKEN;
const FROM_NUMBER = process.env.FROM_NUMBER;

const isExotelConfigured = EXOTEL_SID && EXOTEL_TOKEN && FROM_NUMBER && 
  EXOTEL_SID !== 'your_exotel_sid_here' && 
  EXOTEL_TOKEN !== 'your_exotel_token_here' && 
  FROM_NUMBER !== 'your_exotel_virtual_number';

async function initiateExotelCall(fromNumber, toNumber) {
  try {
    const url = `https://${EXOTEL_SID}:${EXOTEL_TOKEN}@api.exotel.com/v1/Accounts/${EXOTEL_SID}/Calls/connect.json`;
    
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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, callId } = req.query;
  
  // Handle QR generation
  if (req.method === 'POST' && action === 'generate-qr') {
    try {
      const { phoneNumber, label } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      
      // Validate phone number format
      if (!/^\+?[\d\s\-\(\)]+$/.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }
      
      // Generate unique call ID with encoded phone number
      const encodedPhone = Buffer.from(phoneNumber).toString('base64');
      const encodedLabel = Buffer.from(label || 'Unknown Contact').toString('base64');
      const newCallId = `${encodedPhone}_${encodedLabel}_${Date.now()}`;
      
      // Store mapping (though it won't persist in serverless)
      callMappings.set(newCallId, {
        phoneNumber,
        label: label || 'Unknown Contact',
        createdAt: new Date()
      });
      
      // Generate QR code with call ID
      const baseUrl = `https://${req.headers.host}`;
      const qrData = `${baseUrl}/api/call?callId=${newCallId}`;
      const qrCodeDataURL = await QRCode.toDataURL(qrData);
      
      return res.json({
        success: true,
        callId: newCallId,
        qrCode: qrCodeDataURL,
        callUrl: qrData,
        label: label || 'Unknown Contact'
      });
      
    } catch (error) {
      console.error('Error generating QR code:', error);
      return res.status(500).json({ error: 'Failed to generate QR code: ' + error.message });
    }
  }
  
  // Handle call routing
  if (req.method === 'GET' && action === 'call' && callId) {
    try {
      const { from } = req.query;
      
      // Create demo mapping if doesn't exist (for testing)
      if (!callMappings.has(callId)) {
        callMappings.set(callId, {
          phoneNumber: '+1234567890',
          label: 'Demo Contact',
          createdAt: new Date()
        });
      }
      
      const mapping = callMappings.get(callId);
      
      if (!mapping) {
        return res.status(404).send(`
          <html>
            <head><title>Invalid QR Code</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Invalid QR Code</h2>
              <p>This QR code is not valid or has expired.</p>
            </body>
          </html>
        `);
      }
      
      // If no 'from' number provided, show input form
      if (!from) {
        return res.status(200).send(`
          <html>
            <head>
              <title>Make Call</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: Arial, sans-serif; max-width: 400px; margin: 50px auto; padding: 20px; }
                .form-group { margin: 20px 0; }
                input { width: 100%; padding: 12px; font-size: 16px; border: 1px solid #ddd; border-radius: 5px; box-sizing: border-box; }
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
              
              <form action="/api?action=call&callId=${callId}" method="get">
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
        return res.status(200).send(`
          <html>
            <head><title>Demo Mode</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>✅ Demo Mode - Call Would Work!</h2>
              <p>Would call <strong>${mapping.label}</strong></p>
              <p>From: <strong>${from}</strong></p>
              <p>To: <strong>${mapping.phoneNumber}</strong></p>
              <p><small>Configure Exotel credentials to enable actual calling</small></p>
              <br>
              <a href="/" style="color: #007bff; text-decoration: none; padding: 10px 20px; background: #f8f9fa; border-radius: 5px;">← Generate Another QR Code</a>
            </body>
          </html>
        `);
      }
      
      // Initiate call via Exotel
      const callResult = await initiateExotelCall(from, mapping.phoneNumber);
      
      if (callResult.success) {
        return res.status(200).send(`
          <html>
            <head><title>Call Initiated</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>✅ Call Initiated!</h2>
              <p>Calling <strong>${mapping.label}</strong></p>
              <p>You should receive a call shortly on <strong>${from}</strong></p>
              <p><small>Call ID: ${callResult.callSid}</small></p>
              <br>
              <a href="/" style="color: #007bff; text-decoration: none; padding: 10px 20px; background: #f8f9fa; border-radius: 5px;">← Generate Another QR Code</a>
            </body>
          </html>
        `);
      } else {
        return res.status(500).send(`
          <html>
            <head><title>Call Failed</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>❌ Call Failed</h2>
              <p>Unable to initiate call. Please try again.</p>
              <p><small>Error: ${callResult.error}</small></p>
              <br>
              <a href="/" style="color: #007bff; text-decoration: none; padding: 10px 20px; background: #f8f9fa; border-radius: 5px;">← Try Again</a>
            </body>
          </html>
        `);
      }
      
    } catch (error) {
      console.error('Error handling call:', error);
      return res.status(500).send(`
        <html>
          <head><title>Error</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Error</h2>
            <p>Something went wrong. Please try again.</p>
            <br>
            <a href="/" style="color: #007bff; text-decoration: none; padding: 10px 20px; background: #f8f9fa; border-radius: 5px;">← Go Back</a>
          </body>
        </html>
      `);
    }
  }
  
  // Default response
  return res.status(404).json({ error: 'Not found' });
};