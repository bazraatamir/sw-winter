import http from 'node:http';

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    message: 'Энэ бол энэ container-ийн Node version',
    node: process.version,
  }, null, 2));
}).listen(PORT, () => {
  console.log(`✅ Node ${process.version} → порт ${PORT} дээр ажиллаж байна`);
});
