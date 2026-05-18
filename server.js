const express = require('express');
const puppeteer = require('puppeteer');

const app = express();


// =========================
// CLOUDBEDS
// =========================
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

    const { start, end, property_id, hotel } = req.query;

    const hotelId = hotel || '4NCmwS';
    const startDate = start || '2026-05-16';
    const endDate = end || '2026-06-30';
    const propertyId = property_id || '7194';

    await page.goto(
      `https://hotels.cloudbeds.com/en/reservation/${hotelId}?currency=eur`,
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    await new Promise(r => setTimeout(r, 5000));

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


// =========================
// BOOKING SCRAPER
// =========================
app.get('/booking-rooms', async (req, res) => {
  let browser;

  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Missing ?url=' });
    }

    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });

    const page = await browser.newPage();

    // idioma fijo
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 7000));

    // SCRAPER LIMPIO
    const rooms = await page.evaluate(() => {
      const results = [];

      const elements = document.querySelectorAll('div');

      elements.forEach(el => {
        const text = el.innerText;

        if (!text) return;

        const clean = text.toLowerCase();

        const isRoom =
          clean.includes('bed') ||
          clean.includes('dormitory') ||
          clean.includes('double room') ||
          clean.includes('single room') ||
          clean.includes('quadruple') ||
          clean.includes('triple') ||
          clean.includes('cama') ||
          clean.includes('habitación');

        const isNoise =
          clean.includes('review') ||
          clean.includes('location') ||
          clean.includes('policies') ||
          clean.includes('facilities') ||
          clean.includes('availability') ||
          clean.includes('price match') ||
          clean.includes('guest') ||
          clean.length > 180; // corta textos largos

        if (isRoom && !isNoise) {
          results.push(text.trim());
        }
      });

      return [...new Set(results)];
    });

    await browser.close();

    res.json(rooms);

  } catch (error) {
    if (browser) await browser.close();

    res.status(500).json({
      error: error.message
    });
  }
});


// =========================
// KEEP ALIVE
// =========================
app.get('/ping', (req, res) => {
  res.send('ok');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
