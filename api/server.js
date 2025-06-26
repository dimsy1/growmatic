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
  user: 'root',
  password: '',
  database: 'growmatic'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('MySQL Connected...');
});

// Endpoint for admin login
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;

  const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(sql, [username, password], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Server error' });
    }

    if (results.length > 0) {
      // If found
      res.status(200).json({ message: 'Login successful', admin: results[0] });
    } else {
      // Not found
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });
});


// Endpoint to save sensor data
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

// Endpoint to fetch temperature and humidity data
app.get('/api/get-data', (req, res) => {
  const sql = 'SELECT temperature, humidity, timestamp FROM sensor_data ORDER BY timestamp DESC LIMIT 100'; // Get 100 latest data points
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching data from database:', err);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
    res.status(200).json(results);
  });
});

// Endpoint to add or update schedules
app.post('/api/schedules', (req, res) => {
  const { esp_device_id, schedule_id, start_hour, start_minute, end_hour, end_minute } = req.body;
  // Check if schedule_id already exists for this esp_device_id
  const checkSql = 'SELECT * FROM jadwal WHERE esp_device_id = ? AND schedule_id = ?';
  db.query(checkSql, [esp_device_id, schedule_id], (err, results) => {
    if (err) {
      console.error('Error checking existing schedule:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    if (results.length > 0) {
      // If schedule exists, perform UPDATE
      const updateSql = 'UPDATE jadwal SET start_hour = ?, start_minute = ?, end_hour = ?, end_minute = ? WHERE esp_device_id = ? AND schedule_id = ?';
      db.query(updateSql, [start_hour, start_minute, end_hour, end_minute, esp_device_id, schedule_id], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating schedule in database:', updateErr);
          return res.status(500).json({ success: false, message: 'Failed to update schedule' });
        }
        console.log('Schedule successfully updated in database:', updateResult);
        res.status(200).json({ success: true, message: 'Schedule successfully updated' });
      });
    } else {
      // If schedule does not exist, perform INSERT
      const insertSql = 'INSERT INTO jadwal (esp_device_id, schedule_id, start_hour, start_minute, end_hour, end_minute) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(insertSql, [esp_device_id, schedule_id, start_hour, start_minute, end_hour, end_minute], (insertErr, insertResult) => {
        if (insertErr) {
          console.error('Error saving schedule to database:', insertErr);
          return res.status(500).json({ success: false, message: 'Failed to save schedule' });
        }
        console.log('Schedule successfully saved to database:', insertResult);
        res.status(200).json({ success: true, message: 'Schedule successfully saved' });
      });
    }
  });
});


// Endpoint to fetch all schedules (UPDATED)
app.get('/api/schedules', (req, res) => {
  const esp_device_id = req.query.esp_device_id; // Get device ID from query parameter

  let sql = 'SELECT id, esp_device_id, schedule_id, start_hour, start_minute, end_hour, end_minute FROM jadwal';
  let params = [];

  // If esp_device_id is provided, add a WHERE clause to filter
  if (esp_device_id) {
    sql += ' WHERE esp_device_id = ?';
    params.push(esp_device_id);
  }

  // Debugging: Log SQL query and parameters
  console.log('Executing SQL for schedules:', sql, params);

  db.query(sql, params, (err, results) => {
    if (err) {
      console.error('Error fetching schedules from database:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch schedules' });
    }
    res.status(200).json({ success: true, schedules: results });
  });
});

// Endpoint to delete schedules
app.post('/api/schedules/delete', (req, res) => {
  console.log('Received delete request body:', req.body);
  const { esp_device_id, schedule_id } = req.body; 

  if (!esp_device_id || schedule_id === undefined || schedule_id === null) { 
    console.error('Delete request failed: esp_device_id or schedule_id is missing/invalid in request body.');
    return res.status(400).json({ success: false, message: 'Device ID or schedule ID not found in request.' });
  }

  const sql = 'DELETE FROM jadwal WHERE esp_device_id = ? AND schedule_id = ?';
  db.query(sql, [esp_device_id, schedule_id], (err, result) => {
    if (err) {
      console.error('Error deleting schedule from database:', err);
      return res.status(500).json({ success: false, message: 'Failed to delete schedule' });
    }
    if (result.affectedRows === 0) {
      console.warn(`Schedule with esp_device_id ${esp_device_id} and schedule_id ${schedule_id} not found for deletion.`);
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    console.log(`Schedule with esp_device_id ${esp_device_id} and schedule_id ${schedule_id} successfully deleted from database:`, result);
    res.status(200).json({ success: true, message: 'Schedule successfully deleted' });
  });
});

const server = app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});
