// Exposes the local backend (port 5000) through an ngrok tunnel and prints the public URL.
// Run: node tunnel.js   (keep it running while testing on your phone)
const path = require('path');
const ngrok = require(path.join(process.env.APPDATA, 'npm', 'node_modules', '@expo', 'ngrok'));

(async () => {
  try {
    const url = await ngrok.connect({ addr: 5000, proto: 'http' });
    console.log('TUNNEL_URL=' + url);
    console.log('Keep this window open. Press Ctrl+C to stop.');
  } catch (e) {
    console.error('TUNNEL_FAILED:', e.message || e);
    process.exit(1);
  }
})();
