import { chromium } from 'playwright';

async function runAudit() {
  console.log('Starting automated audit...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => {
    errors.push(`Uncaught exception: ${err.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });
  page.on('requestfailed', request => {
    errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  const routesToVisit = [
    '/login',
    '/command-center',
    '/talent',
    '/project-health',
    '/report',
    '/report/print',
    '/tome/EMP001' // assuming EMP001 exists, or it will throw 404
  ];

  for (const route of routesToVisit) {
    console.log(`Visiting http://localhost:3000${route}`);
    try {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle' });
      // Wait for a second for animations/initial renders
      await page.waitForTimeout(1000);
      
      // Look for any buttons and try to click them (safely)
      const buttons = await page.$$('button');
      console.log(`Found ${buttons.length} buttons on ${route}`);
      
      for (let i = 0; i < Math.min(buttons.length, 10); i++) { // click up to 10 buttons
        try {
          await buttons[i].click({ timeout: 1000 });
          await page.waitForTimeout(200);
        } catch (e) {
          // ignore click errors (hidden, disabled, etc.)
        }
      }
    } catch (e) {
      errors.push(`Failed to navigate to ${route}: ${e.message}`);
    }
  }

  await browser.close();

  console.log('\n--- AUDIT RESULTS ---');
  if (errors.length === 0) {
    console.log('No console errors, failed requests, or exceptions detected!');
  } else {
    console.log(`Found ${errors.length} errors:`);
    const uniqueErrors = [...new Set(errors)];
    uniqueErrors.forEach(e => console.log('- ' + e));
  }
}

runAudit().catch(console.error);
