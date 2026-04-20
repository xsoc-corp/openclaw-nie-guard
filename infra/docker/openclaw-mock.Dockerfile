FROM node:20-bookworm-slim
WORKDIR /app
RUN echo '{"name":"openclaw-mock","version":"0.1.0","main":"server.js"}' > package.json
RUN cat > server.js << 'SCRIPT'
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, mock: 'openclaw', path: req.url }));
});
server.listen(18789, () => console.log('mock openclaw listening on 18789'));
SCRIPT
EXPOSE 18789
CMD ["node", "server.js"]
