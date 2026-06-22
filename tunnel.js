const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    console.log('Starting localtunnel on port 8080...');
    const tunnel = await localtunnel({ port: 8080 });
    console.log('Tunnel URL:', tunnel.url);
    fs.writeFileSync('lt.txt', tunnel.url);
    console.log('Successfully wrote URL to lt.txt');
  } catch (err) {
    console.error('Error starting tunnel:', err);
    fs.writeFileSync('lt.txt', 'ERROR: ' + err.message);
  }
})();
