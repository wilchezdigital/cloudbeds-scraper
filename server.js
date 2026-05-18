const express = require('express');

const app = express();

app.get('/availability', async (req, res) => {
  try {
    const start = req.query.start || '2026-05-19';
    const end = req.query.end || '2026-06-20';

    const response = await fetch(
      'https://hotels.cloudbeds.com/booking/availability_calendar',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur'
        },
        body: `start_date=${start}&end_date=${end}&property_id=7194`
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { error: 'No JSON', raw: text };
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ping
app.get('/ping', (req, res) => {
  res.send('ok');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
