const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const router = express.Router();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use('/api', router);

const db = mysql.createConnection({
  host: 'localhost',
  user: 'tifpsdku_growmaticuser', // Ganti dengan username database Anda
  password: '&O.gd9Kw.D97', // Ganti dengan password database Anda
  database: 'tifpsdku_db_growmatic' // Ganti dengan nama database Anda
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('MySQL Connected...');
});

// Endpoint untuk login admin
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length > 0) {
      // Jika ditemukan
      res.status(200).json({ message: 'Login successful', admin: results[0] });
    } else {
      // Tidak ditemukan
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});


// Endpoint untuk menyimpan data sensor
app.post('/api/save-data', (req, res) => {
  const { temperature, humidity } = req.body;

  const sql = 'INSERT INTO sensor_data (temperature, humidity) VALUES (?, ?)';
  db.query(sql, [temperature, humidity], (err, result) => {
    if (err) {
      console.error('Error saving data to database:', err);
      return res.status(500).json({ error: 'Failed to save data' });
    }
    console.log('Data saved to database:', result);
    res.status(200).json({ message: 'Data saved successfully' });
  });
});

// Endpoint untuk mengambil data suhu dan kelembapan
app.get('/api/get-data', (req, res) => {
  const sql = 'SELECT temperature, humidity, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT 100'; // Ambil 100 data terbaru
  // const sql = 'SELECT temperature, humidity FROM sensor_data LIMIT 100';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching data from database:', err);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
    res.status(200).json(results);
  });
});



const server = app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});
