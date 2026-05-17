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

    await page.goto('https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur', {
      waitUntil: 'networkidle2'
    });

    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(async () => {
      const response = await fetch('/booking/availability_calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'start_date=2026-05-16&end_date=2026-06-18&property_id=7194'
      });

      return await response.json();
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
