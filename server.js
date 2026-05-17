const express = require('express');
const puppeteer = require('puppeteer');

const app = express();


// 🔹 Endpoint para mantener vivo el servidor (KEEP ALIVE)
app.get('/ping', (req, res) => {
  res.send('ok');
});


// 🔹 Parser de datos
function parseAvailability(raw) {
  const result = {};

  for (const date in raw) {
    const rooms = raw[date];

    let minPrice = Infinity;
    let maxPrice = 0;
    let totalAvail = 0;

    rooms.forEach(r => {
      const price = parseFloat(r.rate);
      const avail = parseInt(r.avail);

      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
      totalAvail += avail;
    });

    result[date] = {
      min_price: minPrice,
      max_price: maxPrice,
      total_availability: totalAvail
    };
  }

  return result;
}


// 🔹 Endpoint principal
app.get('/availability', async (req, res) => {
  let browser;

  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();

    await page.goto('https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(async () => {
      const response = await fetch('https://hotels.cloudbeds.com/booking/availability_calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'start_date=2026-05-16&end_date=2026-06-18&property_id=7194'
      });

      const text = await response.text();

      try {
        return JSON.parse(text);
      } catch (e) {
        return {};
      }
    });

    await browser.close();

    const parsed = parseAvailability(data);

    res.json(parsed);

  } catch (error) {
    if (browser) await browser.close();

    res.status(500).json({
      error: error.message
    });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
