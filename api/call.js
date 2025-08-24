// Simple call handler for Vercel
const callMappings = new Map();

// Add some demo data
callMappings.set('demo123', {
  phoneNumber: '+1234567890',
  label: 'Demo Contact',
  createdAt: new Date()
});

module.exports = async (req, res) => {
  const { callId, from } = req.query;
  
  try {
    // Get mapping or create demo one
    let mapping = callMappings.get(callId);
    if (!mapping) {
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
    
    // Show demo result (since Exotel not configured)
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