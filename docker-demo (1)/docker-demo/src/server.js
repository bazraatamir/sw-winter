import express from 'express';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 3000;

// Database тохиргоог environment variable-аас уншина
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'secret',
  database: process.env.DB_NAME || 'demo',
};

app.get('/', (req, res) => {
  res.json({
    message: 'Container дотроос мэндчилж байна!',
    node: process.version,
  });
});

app.get('/db', async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.query('SELECT NOW() AS now, VERSION() AS db_version');
    await conn.end();
    res.json({ ok: true, db: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Node ${process.version} дээр порт ${PORT} дээр ажиллаж байна`);
});
