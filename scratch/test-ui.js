const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Wait for the server
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
  
  // Take screenshot before
  await page.screenshot({ path: 'scratch/before.png' });
  
  // The first Textarea is the desktop one (if both exist)
  const textareas = await page.$$('textarea');
  console.log(`Found ${textareas.length} textareas`);
  
  // Type into the first one
  if (textareas.length > 0) {
    await textareas[0].type('what is tracknov');
    console.log('Typed into first textarea');
  }
  
  // Take screenshot after typing
  await page.screenshot({ path: 'scratch/after_typing.png' });
  
  // Find the button (next to textarea or inside same container)
  // We can just find the first button with a Send icon
  const buttons = await page.$$('button');
  console.log(`Found ${buttons.length} buttons`);
  
  // We want the button that is right next to the textarea.
  // In DOM: button next to textarea. We can just evaluate a script.
  await page.evaluate(() => {
    const tas = document.querySelectorAll('textarea');
    if (tas.length > 0) {
      const parent = tas[0].parentElement;
      const btn = parent.querySelector('button[type="button"]');
      if (btn) btn.click();
    }
  });
  console.log('Clicked button');
  
  // Wait a moment for network or loading
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot after click
  await page.screenshot({ path: 'scratch/after_click.png' });
  
  await browser.close();
})();
