const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('car_sales.db');

fs.readFile('cars.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Ошибка при чтении файла:', err);
    return;
  }
  const carsJson = JSON.parse(data);
  db.serialize(() => {
    const insertCar = db.prepare(`INSERT INTO cars (make, model, year, type, transmission, seats, doors, fuel_type, mileage, price, status, image_url, description, vin, color, engine_volume, engine_power) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    carsJson.forEach(brand => {
      const make = brand.name;
      brand.models.forEach(model => {
        // Пример генерации данных для обязательных полей
        const carModel = model.name;
        const year = model['year-from'] || 2020;
        const type = model.class || 'unknown';
        const transmission = 'automatic'; // Замените на реальные данные, если они есть в JSON
        const seats = 5;
        const doors = 4;
        const fuel_type = 'petrol';
        const mileage = 10000;
        const price = 1000000;
        const status = 'available';
        const image_url = '';
        const description = model['cyrillic-name'] || '';
        const vin = model.id || '';
        const color = '';
        const engine_volume = 2.0;
        const engine_power = 150;
        insertCar.run(make, carModel, year, type, transmission, seats, doors, fuel_type, mileage, price, status, image_url, description, vin, color, engine_volume, engine_power);
      });
    });
    insertCar.finalize(() => {
      console.log('Импорт завершён.');
      db.close();
    });
  });
});
