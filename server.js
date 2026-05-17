const express = require('express');
const puppeteer = require('puppeteer');

const app = express();

let browser;

// 🔥 REUTILIZAR browser (clave para evitar sleep lento)
async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true
    });
  }
  return browser;
}

// 🔥 ENDPOINT PRINCIPAL
app.get('/availability', async (req, res) => {
  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    const data = await new Promise(async (resolve) => {
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
              error: 'No JSON',
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

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ error: 'No se capturó request' });
        }
      }, 15000);
    });

    await page.close();

    res.json(data);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// 🔥 PING ENDPOINT (para mantener vivo Render)
app.get('/ping', (req, res) => {
  res.send('ok');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Running on port ${PORT}`);
});
