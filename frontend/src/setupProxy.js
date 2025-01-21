const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy for API requests
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying request to:', req.url);
      }
    })
  );

  // Proxy for WebSocket connections
  app.use(
    '/ws',
    createProxyMiddleware({
      target: 'ws://localhost:8080',
      ws: true,
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReqWs: (proxyReq, req, socket, options, head) => {
        console.log('Proxying WebSocket request to:', req.url);
      }
    })
  );
}; 