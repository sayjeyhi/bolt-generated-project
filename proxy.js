#!/usr/bin/env node
    import http from 'node:http';
    import net from 'node:net';

    const server = http.createServer((request, response) => {
      // Only handle non-CONNECT HTTP requests
      if (request.method !== 'CONNECT') {
        try {
          const targetUrl = request.headers['x-target-url'] || request.url;
          const parsedURL = new URL(targetUrl);
          
          if (parsedURL.protocol !== 'http:') {
            response.statusCode = 400;
            return response.end('Only HTTP requests are supported directly');
          }

          console.log('\n=== Proxying HTTP Request ===');
          console.log('Method:', request.method);
          console.log('Target URL:', parsedURL.toString());

          const proxyRequest = http.request({
            hostname: parsedURL.hostname,
            port: parsedURL.port || 80,
            path: parsedURL.pathname + (parsedURL.search || ''),
            method: request.method,
            headers: request.headers
          });

          proxyRequest.on('response', (proxyResponse) => {
            console.log('\n=== Proxied Response ===');
            console.log('Status:', proxyResponse.statusCode);
            response.writeHead(proxyResponse.statusCode, proxyResponse.headers);
            proxyResponse.pipe(response, { end: true });
          });

          proxyRequest.on('error', (err) => {
            console.error('Proxy Error:', err);
            response.statusCode = 502;
            response.end('Proxy error');
          });

          request.pipe(proxyRequest, { end: true });
        } catch (err) {
          console.error('Error:', err);
          response.statusCode = 400;
          response.end('Invalid URL');
        }
      }
    });

    // Handle HTTPS CONNECT requests
    server.on('connect', (request, clientSocket, head) => {
      try {
        console.log('\n=== Handling HTTPS CONNECT ===');
        const [hostname, port] = request.url.split(':');
        const serverPort = port || 443;

        console.log('Creating tunnel to:', hostname, 'port:', serverPort);

        const serverSocket = net.connect(serverPort, hostname, () => {
          // Send HTTP 200 Connection Established
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n');
          clientSocket.write('Proxy-agent: Node.js-Proxy/1.0\r\n');
          clientSocket.write('\r\n');
          
          // Write any initial data
          if (head && head.length) {
            serverSocket.write(head);
          }

          // Create the tunnel
          serverSocket.pipe(clientSocket);
          clientSocket.pipe(serverSocket);
        });

        serverSocket.on('error', (err) => {
          console.error('Server Socket Error:', err);
          clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        });

        clientSocket.on('error', (err) => {
          console.error('Client Socket Error:', err);
          serverSocket.end();
        });

        serverSocket.on('close', () => {
          console.log('Server socket closed');
          clientSocket.end();
        });

        clientSocket.on('close', () => {
          console.log('Client socket closed');
          serverSocket.end();
        });
      } catch (err) {
        console.error('Unexpected error:', err);
        clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      }
    });

    server.on('clientError', (err, socket) => {
      console.error('Client error:', err);
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });

    server.listen(8888, () => {
      console.log('Proxy server running on http://localhost:8888');
    });
