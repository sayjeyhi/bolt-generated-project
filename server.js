import http from 'node:http';
    import https from 'node:https';

    const proxy = http.createServer((req, res) => {
      const isHttps = req.headers['x-target-protocol'] === 'https';
      const transport = isHttps ? https : http;

      const options = {
        hostname: req.headers['x-target-host'],
        port: req.headers['x-target-port'] || (isHttps ? 443 : 80),
        path: req.url,
        method: req.method,
        headers: req.headers
      };

      const proxyReq = transport.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      req.pipe(proxyReq, { end: true });
    });

    proxy.listen(3000, () => {
      console.log('Proxy server running on http://localhost:3000');
    });
