const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

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

    await page.goto(
      'https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur',
      {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      }
    );

    // 🔥 ESPERAR A QUE CARGUE BIEN
    await new Promise(r => setTimeout(r, 5000));

    // 🔥 HACER LA REQUEST MANUAL DESDE EL CONTEXTO REAL
    const data = await page.evaluate(async () => {
      const response = await fetch('/booking/availability_calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'start_date=2026-05-16&end_date=2026-06-30&property_id=7194'
      });

      try {
        return await response.json();
      } catch (e) {
        return {
          error: 'No JSON',
          raw: await response.text()
        };
      }
    });

    await browser.close();

    res.json(data);

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
