const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

// ENDPOINT PRINCIPAL
app.get('/availability', async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36'
    );

    // 🔥 PARAMS DESDE URL
    const { start, end, property_id, hotel } = req.query;

    const hotelId = hotel || '4NCmwS';
    const startDate = start || '2026-05-16';
    const endDate = end || '2026-06-30';
    const propertyId = property_id || '7194';

    // 🔥 IR AL HOTEL DINÁMICO
    await page.goto(
      `https://hotels.cloudbeds.com/en/reservation/${hotelId}?currency=eur`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    // Esperar a que cargue
    await new Promise(r => setTimeout(r, 5000));

    // 🔥 FETCH REAL DESDE EL NAVEGADOR
    const data = await page.evaluate(
      async ({ startDate, endDate, propertyId }) => {
        const response = await fetch('/booking/availability_calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `start_date=${startDate}&end_date=${endDate}&property_id=${propertyId}`
        });

        try {
          return await response.json();
        } catch (e) {
          return {
            error: 'No JSON',
            raw: await response.text()
          };
        }
      },
      { startDate, endDate, propertyId }
    );

    // 🔥 FORMATEO
    const formatted = Object.entries(data).map(([date, rooms]) => {
      const prices = rooms.map(r => parseFloat(r.rate));
      const availability = rooms.map(r => r.avail);

      return {
        date,
        price_min: Math.min(...prices),
        price_max: Math.max(...prices),
        available_rooms: availability.reduce((a, b) => a + b, 0)
      };
    });

    await browser.close();

    res.json(formatted);

  } catch (error) {
    if (browser) await browser.close();

    res.status(500).json({
      error: error.message
    });
  }
});

// KEEP ALIVE
app.get('/ping', (req, res) => {
  res.send('ok');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
