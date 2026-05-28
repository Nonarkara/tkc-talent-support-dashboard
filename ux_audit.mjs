import { chromium } from 'playwright';
import path from 'path';

async function runUXAudit() {
  console.log('Starting UX/UI Audit...');
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // High DPI for crisp screenshots
  });
  const page = await context.newPage();

  const artifactDir = '/Users/nonarkara/.gemini/antigravity/brain/dc1ba5f3-016e-4ffe-b5b6-96b186b173e8';
  
  const routes = [
    { name: 'Login', url: '/login' },
    { name: 'CommandCenter', url: '/command-center' },
    { name: 'TalentPool', url: '/talent' },
    { name: 'ProjectHealth', url: '/project-health' },
    { name: 'Report', url: '/report' }
  ];

  const report = [];

  for (const route of routes) {
    console.log(`\nAuditing ${route.name}...`);
    const start = Date.now();
    await page.goto(`http://localhost:3000${route.url}`, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;
    console.log(`Load time: ${loadTime}ms`);
    
    // Allow animations to settle
    await page.waitForTimeout(1500);
    
    const screenshotPath = path.join(artifactDir, `audit_${route.name}_base.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Find all buttons and toggles
    const buttons = await page.$$('button, a, input[type="checkbox"], [role="button"], .talent-row-clickable');
    console.log(`Found ${buttons.length} interactable elements.`);
    
    let interactionIssues = 0;
    
    // Try to hover and click a few elements to test snappiness
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      try {
        const btnStart = Date.now();
        await buttons[i].hover({ timeout: 1000 });
        await page.waitForTimeout(200); // Wait for hover effect
        await buttons[i].click({ timeout: 1000, trial: true }); // Trial click to check if interactable
        const btnTime = Date.now() - btnStart;
        if (btnTime > 500) interactionIssues++;
      } catch (e) {
        interactionIssues++;
      }
    }
    
    if (buttons.length > 0) {
      const activeScreenshotPath = path.join(artifactDir, `audit_${route.name}_active.png`);
      await page.screenshot({ path: activeScreenshotPath, fullPage: true });
    }

    report.push({
      route: route.name,
      loadTime,
      interactableElements: buttons.length,
      interactionIssues,
      snappy: loadTime < 1000 && interactionIssues === 0
    });
  }

  await browser.close();
  
  console.log('\n--- AUDIT SUMMARY ---');
  console.table(report);
}

runUXAudit().catch(console.error);
