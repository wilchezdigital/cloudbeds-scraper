const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

app.get('/availability', async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox'],
      headless: true
    });

    const page = await browser.newPage();

    await page.goto('https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur', {
      waitUntil: 'networkidle2'
    });

    await new Promise(r => setTimeout(r, 5000));

    const data = await page.evaluate(async () => {
      const res = await fetch('/booking/availability_calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'start_date=2026-05-16&end_date=2026-06-18&property_id=7194'
      });

      return await res.json();
    });

    await browser.close();

    res.json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Running'));
