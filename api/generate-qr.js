const QRCode = require('qrcode');

// In-memory storage for call mappings (use database in production)
const callMappings = new Map();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    
    // Store mapping (Note: This won't persist across serverless invocations)
    // In production, use a database like Redis or MongoDB
    callMappings.set(callId, {
      phoneNumber,
      label: label || 'Unknown Contact',
      createdAt: new Date()
    });
    
    // Generate QR code with call ID (not phone number)
    const baseUrl = `https://${req.headers.host}`;
    const qrData = `${baseUrl}/call/${callId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    
    res.json({
      success: true,
      callId,
      qrCode: qrCodeDataURL,
      callUrl: qrData,
      label: label || 'Unknown Contact'
    });
    
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code: ' + error.message });
  }
}