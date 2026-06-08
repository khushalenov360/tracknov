const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching visible Chrome browser...');
  const browser = await puppeteer.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();

  console.log('Navigating to localhost:3000/dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });

  // Wait for the textarea
  console.log('Looking for Harita textarea...');
  try {
    await page.waitForSelector('textarea', { timeout: 5000 });
    console.log('Textarea found!');

    console.log('Testing typing speed (DOM latency)...');
    const startTime = Date.now();
    const textToType = 'This is a test of the typing speed to see if there is any lag.';
    await page.type('textarea', textToType, { delay: 10 }); // 10ms delay between keystrokes
    const endTime = Date.now();

    const expectedTime = textToType.length * 10;
    const actualTime = endTime - startTime;
    console.log(`Expected time (based on 10ms delay): ~${expectedTime}ms`);
    console.log(`Actual time taken: ${actualTime}ms`);

    if (actualTime > expectedTime * 2) {
      console.log('RESULT: Significant lag detected during typing!');
    } else {
      console.log('RESULT: Typing was fast and smooth. No React blocking lag detected.');
    }

    // Try to click send to see the response
    console.log('Looking for send button...');
    const buttons = await page.$$('button');
    let sendBtn = null;
    for (const btn of buttons) {
      const className = await btn.evaluate(el => el.className);
      if (className.includes('rounded-full')) {
         sendBtn = btn;
      }
    }

    if (sendBtn) {
      console.log('Clicking send...');
      await sendBtn.click();
      console.log('Waiting for AI response...');
      await new Promise(r => setTimeout(r, 5000));
      
      const markdownNodes = await page.$$('.prose');
      if (markdownNodes.length > 0) {
        const lastResponse = await markdownNodes[markdownNodes.length - 1].evaluate(el => el.innerText);
        console.log('AI Response:', lastResponse);
      } else {
        console.log('No prose response found.');
      }
    }

  } catch (e) {
    console.log('Failed to interact with page. This is likely because the browser was redirected to a login page since the automated instance has no authentication cookies.');
    console.log('Current URL:', page.url());
  }

  await browser.close();
})();
