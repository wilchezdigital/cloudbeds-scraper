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

    // INTERCEPTAR RESPUESTA REAL
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/booking/availability_calendar') &&
      response.request().method() === 'POST'
    );

    await page.goto(
      'https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur',
      {
        waitUntil: 'networkidle2',
        timeout: 60000
      }
    );

    const response = await responsePromise;

    let data;

    try {
      data = await response.json();
    } catch (e) {
      data = {
        error: 'No JSON',
        raw: await response.text()
      };
    }

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
