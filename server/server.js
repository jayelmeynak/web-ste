const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
const db = new sqlite3.Database('./car_sales.db');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Создание таблицы, если она не существует
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS cars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make TEXT,
    model TEXT,
    year INTEGER,
    type TEXT,
    transmission TEXT,
    seats INTEGER,
    doors INTEGER,
    fuel_type TEXT,
    mileage INTEGER,
    price REAL,
    status TEXT,
    image_url TEXT,
    description TEXT,
    vin TEXT,
    color TEXT,
    engine_volume REAL,
    engine_power INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    password_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER,
    client_id INTEGER,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_price REAL,
    status TEXT,
    delivery_address TEXT,
    delivery_date DATE,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS test_drives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    car_id INTEGER,
    client_id INTEGER,
    date DATE,
    time TIME,
    notes TEXT,
    FOREIGN KEY (car_id) REFERENCES cars(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  )`);

  // (Заполнение тестовыми данными отключено, используйте import_cars_from_json.js для импорта)
});

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

// API для получения списка автомобилей с пагинацией
app.get('/api/cars', (req, res) => {
  const { type, transmission, maxPrice, minPrice, make, model, year, fuelType } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

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

  // Получи��ь общее количество
  db.get('SELECT COUNT(*) as count FROM (' + query + ')', params, (err, countRow) => {
    if (err) {
      console.error('Ошибка при подсчете автомобилей:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    // Добавить пагинацию
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Ошибка при получении автомобилей:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
        return;
      }
      res.json({
        cars: rows,
        total: countRow.count,
        page,
        limit
      });
    });
  });
});

// API для получения деталей автомобиля по ID
app.get('/api/cars/:id', (req, res) => {
  db.get('SELECT * FROM cars WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      console.error('Ошибка при получении автомобиля:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    if (!row) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    res.json(row);
  });
});

// API для регистрации пользователя
app.post('/api/register', (req, res) => {
  const { firstName, lastName, email, phone, address, password } = req.body;
  
  // Хеширование пароля
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error('Ошибка при хешировании пароля:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    
    // Добавление пользователя в базу данных
    db.run(
      'INSERT INTO clients (first_name, last_name, email, phone, address, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone, address, hashedPassword],
      function(err) {
        if (err) {
          console.error('Ошибка при регистрации:', err);
          res.status(500).json({ error: 'Ошибка сервера' });
          return;
        }
        
        // Создание JWT токена
        const token = jwt.sign(
          { id: this.lastID, email },
          process.env.JWT_SECRET || 'your_jwt_secret',
          { expiresIn: '24h' }
        );
        
        res.status(201).json({ token, userId: this.lastID });
      }
    );
  });
});

app.get('/api/cars/filters', (req, res) => {
  db.all('SELECT DISTINCT make FROM cars ORDER BY make', [], (err, makes) => {
    if (err) return res.status(500).json({ error: 'Ошибка сервера' });
    db.all('SELECT DISTINCT type FROM cars ORDER BY type', [], (err, types) => {
      if (err) return res.status(500).json({ error: 'Ошибка сервера' });
      db.all('SELECT DISTINCT transmission FROM cars ORDER BY transmission', [], (err, transmissions) => {
        if (err) return res.status(500).json({ error: 'Ошибка сервера' });
        db.all('SELECT DISTINCT year FROM cars ORDER BY year DESC', [], (err, years) => {
          if (err) return res.status(500).json({ error: 'Ошибка сервера' });
          res.json({
            makes: makes.map(m => m.make).filter(Boolean),
            types: types.map(t => t.type).filter(Boolean),
            transmissions: transmissions.map(t => t.transmission).filter(Boolean),
            years: years.map(y => y.year).filter(Boolean)
          });
        });
      });
    });
  });
});

// API для входа пользователя
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  // Поиск пользователя по email
  db.get('SELECT * FROM clients WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Ошибка при входе:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    // Проверка пароля
    bcrypt.compare(password, user.password_hash, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
      }
      
      // Создание JWT токена
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'your_jwt_secret',
        { expiresIn: '24h' }
      );
      
      res.json({ token, userId: user.id });
    });
  });
});

// API для создания заказа (покупки автомобиля)
app.post('/api/orders', authenticateToken, (req, res) => {
  const { carId, deliveryAddress, deliveryDate } = req.body;
  const clientId = req.user.id;
  
  // Проверка, доступен ли автомобиль для покупки
  db.get('SELECT * FROM cars WHERE id = ? AND status = "available"', [carId], (err, car) => {
    if (err) {
      console.error('Ошибка при создании заказа:', err);
      res.status(500).json({ error: 'Ошибка се��вера' });
      return;
    }
    if (!car) {
      return res.status(400).json({ error: 'Автомобиль недоступен для покупки' });
    }
    
    // Создание заказа
    db.run(
      'INSERT INTO orders (car_id, client_id, total_price, delivery_address, delivery_date) VALUES (?, ?, ?, ?, ?)',
      [carId, clientId, car.price, deliveryAddress, deliveryDate],
      function(err) {
        if (err) {
          console.error('Ошибка при создании заказа:', err);
          res.status(500).json({ error: 'Ошибка сервера' });
          return;
        }
        
        // Обновление статуса автомобиля
        db.run('UPDATE cars SET status = "reserved" WHERE id = ?', [carId], (err) => {
          if (err) {
            console.error('Ошибка при обновлении статуса автомобиля:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
            return;
          }
          res.status(201).json({ orderId: this.lastID });
        });
      }
    );
  });
});

// API для записи на тест-драйв
app.post('/api/test-drives', authenticateToken, (req, res) => {
  const { carId, date, time, notes } = req.body;
  const clientId = req.user.id;
  
  // Проверка, существует ли автомобиль
  db.get('SELECT * FROM cars WHERE id = ?', [carId], (err, car) => {
    if (err) {
      console.error('Ошибка при записи на тест-драйв:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    if (!car) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    
    // Создание записи на тест-драйв
    db.run(
      'INSERT INTO test_drives (car_id, client_id, date, time, notes) VALUES (?, ?, ?, ?, ?)',
      [carId, clientId, date, time, notes],
      function(err) {
        if (err) {
          console.error('Ошибка при записи на тест-драйв:', err);
          res.status(500).json({ error: 'Ошибка сервера' });
          return;
        }
        res.status(201).json({ testDriveId: this.lastID });
      }
    );
  });
});

// API для получения заказов пользователя
app.get('/api/orders', authenticateToken, (req, res) => {
  const clientId = req.user.id;
  
  db.all(`
    SELECT o.*, c.make, c.model, c.year, c.image_url 
    FROM orders o 
    JOIN cars c ON o.car_id = c.id 
    WHERE o.client_id = ?
    ORDER BY o.order_date DESC
  `, [clientId], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении заказов:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    res.json(rows);
  });
});

// API для получения тест-драйвов пользователя
app.get('/api/test-drives', authenticateToken, (req, res) => {
  const clientId = req.user.id;
  
  db.all(`
    SELECT td.*, c.make, c.model, c.year, c.image_url 
    FROM test_drives td 
    JOIN cars c ON td.car_id = c.id 
    WHERE td.client_id = ?
    ORDER BY td.date, td.time
  `, [clientId], (err, rows) => {
    if (err) {
      console.error('Ошибка при получении тест-драйвов:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    res.json(rows);
  });
});

// API для получения профиля пользователя
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get('SELECT id, first_name, last_name, email, phone, address, created_at FROM clients WHERE id = ?', [req.user.id], (err, row) => {
    if (err) {
      console.error('Ошибка при получении профиля:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
      return;
    }
    if (!row) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(row);
  });
});

// API для обновления профиля пользователя
app.put('/api/profile', authenticateToken, (req, res) => {
  const { firstName, lastName, phone, address } = req.body;
  
  db.run(
    'UPDATE clients SET first_name = ?, last_name = ?, phone = ?, address = ? WHERE id = ?',
    [firstName, lastName, phone, address, req.user.id],
    function(err) {
      if (err) {
        console.error('Ошибка при обновлении профиля:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
        return;
      }
      res.json({ message: 'Профиль успешно обновлен' });
    }
  );
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
