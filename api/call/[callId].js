const axios = require('axios');

// In-memory storage (same limitation as above - use database in production)
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

module.exports = async function handler(req, res) {
  const { callId } = req.query;
  const { from } = req.query;
  
  try {
    // For demo purposes, create a mock mapping if it doesn't exist
    if (!callMappings.has(callId)) {
      // In a real app, this would come from a database
      // For demo, we'll create a mock entry
      const mockMapping = {
        phoneNumber: '+1234567890',
        label: 'Demo Contact',
        createdAt: new Date()
      };
      callMappings.set(callId, mockMapping);
    }
    
    const mapping = callMappings.get(callId);
    
    if (!mapping) {
      return res.status(404).send(`
        <html>
          <head><title>Invalid QR Code</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Invalid or Expired QR Code</h2>
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
            
            <form action="/api/call/${callId}" method="get">
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
          <head><title>Demo Mode</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>⚠️ Demo Mode</h2>
            <p>Exotel credentials not configured.</p>
            <p>Would call <strong>${mapping.label}</strong> from <strong>${from}</strong></p>
            <p><small>Configure environment variables to enable actual calling</small></p>
            <br>
            <a href="/" style="color: #007bff;">← Generate Another QR Code</a>
          </body>
        </html>
      `);
    }
    
    // Initiate call via Exotel
    const callResult = await initiateExotelCall(from, mapping.phoneNumber);
    
    if (callResult.success) {
      res.status(200).send(`
        <html>
          <head><title>Call Initiated</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>✅ Call Initiated!</h2>
            <p>Calling <strong>${mapping.label}</strong></p>
            <p>You should receive a call shortly on <strong>${from}</strong></p>
            <p><small>Call ID: ${callResult.callSid}</small></p>
            <br>
            <a href="/" style="color: #007bff;">← Generate Another QR Code</a>
          </body>
        </html>
      `);
    } else {
      res.status(500).send(`
        <html>
          <head><title>Call Failed</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>❌ Call Failed</h2>
            <p>Unable to initiate call. Please try again.</p>
            <p><small>Error: ${callResult.error}</small></p>
            <br>
            <a href="/" style="color: #007bff;">← Try Again</a>
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('Error handling call:', error);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Internal Server Error</h2>
          <p>Something went wrong. Please try again.</p>
          <br>
          <a href="/" style="color: #007bff;">← Go Back</a>
        </body>
      </html>
    `);
  }
}