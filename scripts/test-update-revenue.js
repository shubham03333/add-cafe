const fetch = require('node-fetch');

async function updateRevenue() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/update-revenue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date: '2025-04-09',
        revenue: 3200
      })
    });

    const result = await response.json();
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

updateRevenue();
