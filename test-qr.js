// Quick test script to verify QR generation
const axios = require('axios');

async function testQRGeneration() {
  try {
    console.log('Testing QR code generation...');
    
    const response = await axios.post('http://localhost:3000/generate-qr', {
      phoneNumber: '+1234567890',
      label: 'Test Contact'
    });
    
    console.log('✅ QR Generation Success!');
    console.log('Call ID:', response.data.callId);
    console.log('Label:', response.data.label);
    console.log('Call URL:', response.data.callUrl);
    console.log('QR Code generated:', response.data.qrCode ? 'Yes' : 'No');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testQRGeneration();