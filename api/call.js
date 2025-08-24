// Simple call handler for Vercel
const axios = require('axios');

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
  const { callId, from } = req.query;
  
  try {
    // Decode phone number and label from call ID
    let mapping;
    try {
      const parts = callId.split('_');
      if (parts.length >= 2) {
        const phoneNumber = Buffer.from(parts[0], 'base64').toString();
        const label = Buffer.from(parts[1], 'base64').toString();
        mapping = {
          phoneNumber,
          label,
          createdAt: new Date()
        };
      } else {
        throw new Error('Invalid call ID format');
      }
    } catch (decodeError) {
      // Fallback to demo data if decoding fails
      mapping = {
        phoneNumber: '+1234567890',
        label: 'Demo Contact',
        createdAt: new Date()
      };
    }
    
    // If no 'from' number provided, show input form
    if (!from) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Make Call</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 400px; 
                margin: 50px auto; 
                padding: 20px; 
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .form-group { margin: 20px 0; }
              input { 
                width: 100%; 
                padding: 12px; 
                font-size: 16px; 
                border: 1px solid #ddd; 
                border-radius: 5px; 
                box-sizing: border-box; 
              }
              button { 
                width: 100%; 
                padding: 15px; 
                font-size: 18px; 
                background: #007bff; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
              }
              button:hover { background: #0056b3; }
              .contact-info { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 5px; 
                margin-bottom: 20px; 
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="contact-info">
                <h3>📞 Calling: ${mapping.label}</h3>
                <p><small>QR Code ID: ${callId}</small></p>
              </div>
              
              <form action="/api/call" method="get">
                <input type="hidden" name="callId" value="${callId}">
                <div class="form-group">
                  <label>Your Phone Number:</label>
                  <input type="tel" name="from" placeholder="+1234567890" required>
                </div>
                <button type="submit">📞 Make Call</button>
              </form>
            </div>
          </body>
        </html>
      `);
    }
    
    // Check if Exotel is configured and make actual call
    if (!isExotelConfigured) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Call Demo</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 0 auto;
              }
              .success { color: #28a745; }
              .btn {
                display: inline-block;
                padding: 10px 20px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="success">✅ Demo Mode - Call Would Work!</h2>
              <p>Would call <strong>${mapping.label}</strong></p>
              <p>From: <strong>${from}</strong></p>
              <p>To: <strong>${mapping.phoneNumber}</strong></p>
              <p><small>Configure Exotel credentials to enable actual calling</small></p>
              <a href="/" class="btn">← Generate Another QR Code</a>
            </div>
          </body>
        </html>
      `);
    }
    
    // Make actual Exotel call
    const callResult = await initiateExotelCall(from, mapping.phoneNumber);
    
    if (callResult.success) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Call Initiated</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 0 auto;
              }
              .success { color: #28a745; }
              .btn {
                display: inline-block;
                padding: 10px 20px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="success">✅ Call Initiated Successfully!</h2>
              <p>Calling <strong>${mapping.label}</strong></p>
              <p>You should receive a call shortly on <strong>${from}</strong></p>
              <p><small>Call ID: ${callResult.callSid}</small></p>
              <p><small>Status: ${callResult.status}</small></p>
              <a href="/" class="btn">← Generate Another QR Code</a>
            </div>
          </body>
        </html>
      `);
    } else {
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Call Failed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 50px; 
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 0 auto;
              }
              .error { color: #dc3545; }
              .btn {
                display: inline-block;
                padding: 10px 20px;
                background: #007bff;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 class="error">❌ Call Failed</h2>
              <p>Unable to initiate call to <strong>${mapping.label}</strong></p>
              <p><small>Error: ${callResult.error}</small></p>
              <a href="/" class="btn">← Try Again</a>
            </div>
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2>❌ Error</h2>
          <p>Something went wrong. Please try again.</p>
          <a href="/" style="color: #007bff;">← Go Back</a>
        </body>
      </html>
    `);
  }
};