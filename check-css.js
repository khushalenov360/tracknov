fetch('http://localhost:3000/login')
  .then(res => res.text())
  .then(html => {
    const matches = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi)];
    if (matches.length === 0) {
      console.log('No stylesheet links found. Dumping first 2000 chars of HTML:');
      console.log(html.substring(0, 2000));
      return;
    }
    console.log('Found stylesheets:', matches.map(m => m[1]));
    return fetch('http://localhost:3000' + matches[0][1]).then(r => r.text());
  })
  .then(css => {
    if (!css) return;
    console.log('CSS length:', css.length);
    console.log('Has Tailwind reset (.flex):', css.includes('.flex'));
    console.log('Has glass-panel:', css.includes('glass-panel'));
    console.log('Has backdrop-filter:', css.includes('backdrop-filter'));
    console.log('Has color-bg variable:', css.includes('--color-bg'));
  })
  .catch(err => console.error('Error:', err.message));
