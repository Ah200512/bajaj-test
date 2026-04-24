const https = require('https');

const data = JSON.stringify({
  data: ['A->B', 'A->C', 'B->D']
});

const options = {
  hostname: 'bajaj-test-backend-finq.onrender.com',
  port: 443,
  path: '/bfhl',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);

  let responseBody = '';
  res.on('data', (d) => {
    responseBody += d;
  });

  res.on('end', () => {
    try {
      console.log('Response Body:');
      console.log(JSON.stringify(JSON.parse(responseBody), null, 2));
    } catch (e) {
      console.log('Error parsing response:', e.message);
      console.log('Raw body:', responseBody);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();
