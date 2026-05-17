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

    // 👇 INTERCEPTAR la request real de Cloudbeds
    const data = await new Promise(async (resolve, reject) => {
      let resolved = false;

      page.on('response', async (response) => {
        const url = response.url();

        if (url.includes('/booking/availability_calendar') && !resolved) {
          resolved = true;
          try {
            const json = await response.json();
            resolve(json);
          } catch (e) {
            resolve({
              error: 'No se pudo parsear JSON',
              raw: await response.text()
            });
          }
        }
      });

      await page.goto(
        'https://hotels.cloudbeds.com/en/reservation/4NCmwS?currency=eur',
        {
          waitUntil: 'networkidle2',
          timeout: 60000
        }
      );

      // fallback por si no intercepta nada
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ error: 'No se capturó la request' });
        }
      }, 15000);
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
