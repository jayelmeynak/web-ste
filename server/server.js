const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Конфигурация базы данных
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'car_sales'
};

// Создание пула соединений с базой данных
const pool = mysql.createPool(dbConfig);

// Middleware для проверки JWT токена
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Недействительный токен' });
    req.user = user;
    next();
  });
};

// Маршруты
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// API для получения списка автомобилей
app.get('/api/cars', async (req, res) => {
  try {
    const { type, transmission, maxPrice, minPrice, make, model, year, fuelType } = req.query;
    
    let query = 'SELECT * FROM cars WHERE status != "sold"';
    const params = [];
    
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    
    if (transmission) {
      query += ' AND transmission = ?';
      params.push(transmission);
    }
    
    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }
    
    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }
    
    if (make) {
      query += ' AND make LIKE ?';
      params.push(`%${make}%`);
    }
    
    if (model) {
      query += ' AND model LIKE ?';
      params.push(`%${model}%`);
    }
    
    if (year) {
      query += ' AND year = ?';
      params.push(parseInt(year));
    }
    
    if (fuelType) {
      query += ' AND fuel_type = ?';
      params.push(fuelType);
    }
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Ошибка при получении автомобилей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для получения деталей автомобиля по ID
app.get('/api/cars/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cars WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Ошибка при получении автомобиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для регистрации пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, address, password } = req.body;
    
    // Проверка, существует ли пользователь с так��м email
    const [existingUsers] = await pool.query('SELECT * FROM clients WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }
    
    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Добавление пользователя в базу данных
    const [result] = await pool.query(
      'INSERT INTO clients (first_name, last_name, email, phone, address, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone, address, hashedPassword]
    );
    
    // Создание JWT токена
    const token = jwt.sign(
      { id: result.insertId, email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({ token, userId: result.insertId });
  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для входа пользователя
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Поиск пользователя по email
    const [users] = await pool.query('SELECT * FROM clients WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const user = users[0];
    
    // Проверка пароля
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    // Создание JWT токена
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '24h' }
    );
    
    res.json({ token, userId: user.id });
  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для создания заказа (покупки автомобиля)
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { carId, deliveryAddress, deliveryDate } = req.body;
    const clientId = req.user.id;
    
    // Проверка, доступен ли автомобиль для покупки
    const [cars] = await pool.query('SELECT * FROM cars WHERE id = ? AND status = "available"', [carId]);
    
    if (cars.length === 0) {
      return res.status(400).json({ error: 'Автомобиль недоступен для покупки' });
    }
    
    const car = cars[0];
    
    // Создание заказа
    const [result] = await pool.query(
      'INSERT INTO orders (car_id, client_id, total_price, delivery_address, delivery_date) VALUES (?, ?, ?, ?, ?)',
      [carId, clientId, car.price, deliveryAddress, deliveryDate]
    );
    
    // Обновление статуса автомобиля
    await pool.query('UPDATE cars SET status = "reserved" WHERE id = ?', [carId]);
    
    res.status(201).json({ orderId: result.insertId });
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для записи на тест-драйв
app.post('/api/test-drives', authenticateToken, async (req, res) => {
  try {
    const { carId, date, time, notes } = req.body;
    const clientId = req.user.id;
    
    // Проверка, существует ли автомобиль
    const [cars] = await pool.query('SELECT * FROM cars WHERE id = ?', [carId]);
    
    if (cars.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    
    // Создание записи на тест-драйв
    const [result] = await pool.query(
      'INSERT INTO test_drives (car_id, client_id, date, time, notes) VALUES (?, ?, ?, ?, ?)',
      [carId, clientId, date, time, notes]
    );
    
    res.status(201).json({ testDriveId: result.insertId });
  } catch (error) {
    console.error('Ошибка при записи на тест-драйв:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для получения заказов пользователя
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.id;
    
    const [rows] = await pool.query(`
      SELECT o.*, c.make, c.model, c.year, c.image_url 
      FROM orders o 
      JOIN cars c ON o.car_id = c.id 
      WHERE o.client_id = ?
      ORDER BY o.order_date DESC
    `, [clientId]);
    
    res.json(rows);
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для получения тест-драйвов пользователя
app.get('/api/test-drives', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.id;
    
    const [rows] = await pool.query(`
      SELECT td.*, c.make, c.model, c.year, c.image_url 
      FROM test_drives td 
      JOIN cars c ON td.car_id = c.id 
      WHERE td.client_id = ?
      ORDER BY td.date, td.time
    `, [clientId]);
    
    res.json(rows);
  } catch (error) {
    console.error('Ошибка при получении тест-драйвов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для получения профиля пользователя
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, first_name, last_name, email, phone, address, created_at FROM clients WHERE id = ?', [req.user.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Ошибка при получении профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// API для обновления профиля пользователя
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    
    await pool.query(
      'UPDATE clients SET first_name = ?, last_name = ?, phone = ?, address = ? WHERE id = ?',
      [firstName, lastName, phone, address, req.user.id]
    );
    
    res.json({ message: 'Профиль успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});