-- database/schema.sql
CREATE DATABASE IF NOT EXISTS car_sales;
USE car_sales;

-- Таблица автомобилей
CREATE TABLE cars (
    id INT AUTO_INCREMENT PRIMARY KEY,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INT NOT NULL,
    type ENUM('economy', 'comfort', 'premium', 'suv', 'minivan') NOT NULL,
    transmission ENUM('manual', 'automatic') NOT NULL,
    seats INT NOT NULL,
    doors INT NOT NULL,
    fuel_type ENUM('petrol', 'diesel', 'hybrid', 'electric') NOT NULL,
    mileage INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('available', 'sold', 'reserved') DEFAULT 'available',
    image_url VARCHAR(255),
    description TEXT,
    vin VARCHAR(17),
    color VARCHAR(50),
    engine_volume FLOAT,
    engine_power INT
);

-- Таблица клиентов
CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица заказов (покупок)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    client_id INT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    delivery_address VARCHAR(255),
    delivery_date DATE,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Таблица платежей
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    method ENUM('credit_card', 'bank_transfer', 'cash', 'loan') NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_id VARCHAR(100),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Таблица тест-драйвов
CREATE TABLE test_drives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    car_id INT NOT NULL,
    client_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    FOREIGN KEY (car_id) REFERENCES cars(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Наполнение базы тестовыми данными
INSERT INTO cars (make, model, year, type, transmission, seats, doors, fuel_type, mileage, price, status, image_url, description, vin, color, engine_volume, engine_power) VALUES
('Toyota', 'Camry', 2022, 'comfort', 'automatic', 5, 4, 'hybrid', 15000, 2500000.00, 'available', 'https://example.com/toyota-camry.jpg', 'Комфортабельный седан с гибридным двигателем', 'JT2BF22K1W0123456', 'Белый', 2.5, 180),
('BMW', 'X5', 2021, 'suv', 'automatic', 5, 5, 'diesel', 25000, 5500000.00, 'available', 'https://example.com/bmw-x5.jpg', 'Премиальный внедорожник с полным приводом', 'WBAKJ4C50BC123456', 'Черный', 3.0, 249),
('Hyundai', 'Solaris', 2023, 'economy', 'automatic', 5, 4, 'petrol', 5000, 1200000.00, 'available', 'https://example.com/hyundai-solaris.jpg', 'Экономичный городской автомобиль', 'Z94CT41DBFR123456', 'Серебристый', 1.6, 123),
('Mercedes', 'E-Class', 2022, 'premium', 'automatic', 5, 4, 'petrol', 10000, 6000000.00, 'reserved', 'https://example.com/mercedes-eclass.jpg', 'Роскошный бизнес-класс', 'WDDZF4JB5KA123456', 'Синий', 2.0, 197),
('Kia', 'Carnival', 2023, 'minivan', 'automatic', 7, 5, 'diesel', 8000, 3800000.00, 'available', 'https://example.com/kia-carnival.jpg', 'Просторный минивэн для семьи', 'KNDMB5C16K6123456', 'Серый', 2.2, 199);

INSERT INTO clients (first_name, last_name, email, phone, address, password_hash) VALUES
('Иван', 'Иванов', 'ivanov@example.com', '+79161234567', 'г. Москва, ул. Ленина, д. 10, кв. 5', '$2a$10$xJwL5v5zPZ6U5U5U5U5U5e'),
('Петр', 'Петров', 'petrov@example.com', '+79167654321', 'г. Санкт-Петербург, пр. Невский, д. 20, кв. 15', '$2a$10$xJwL5v5zPZ6U5U5U5U5U5e');

INSERT INTO orders (car_id, client_id, order_date, total_price, status, delivery_address, delivery_date) VALUES
(4, 1, '2023-06-01 14:30:00', 6000000.00, 'confirmed', 'г. Москва, ул. Ленина, д. 10', '2023-06-15'),
(1, 2, '2023-06-15 10:15:00', 2500000.00, 'pending', 'г. Санкт-Петербург, пр. Невский, д. 20', '2023-06-30');

INSERT INTO test_drives (car_id, client_id, date, time, status, notes) VALUES
(2, 1, '2023-06-20', '15:00:00', 'confirmed', 'Клиент интересуется системой полного привода'),
(3, 2, '2023-06-25', '12:30:00', 'pending', 'Клиент хочет проверить расход топлива');