// public/js/cars.js
document.addEventListener('DOMContentLoaded', function() {
    const carsContainer = document.getElementById('cars-container');
    const paginationContainer = document.getElementById('pagination-container');
    const carDetailsModal = new bootstrap.Modal(document.getElementById('carDetailsModal'));
    let allCars = [];
    
    // Переменные для пагинации
    let currentPage = 1;
    let totalCars = 0;
    let totalPages = 0;
    let carsPerPage = 20; // Количество автомобилей на странице
    let currentFilters = {};

    function loadFilterOptions() {
        fetch('/api/cars/filters')
            .then(res => res.json())
            .then(data => {
                // Марки
                const makeSelect = document.getElementById('car-make');
                makeSelect.innerHTML = '<option value="">Все марки</option>';
                data.makes.forEach(make => {
                    makeSelect.innerHTML += `<option value="${make}">${make}</option>`;
                });

                // Типы кузова
                const typeSelect = document.getElementById('car-type');
                typeSelect.innerHTML = '<option value="">Все типы</option>';
                data.types.forEach(type => {
                    typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
                });

                // Коробка передач
                const transmissionSelect = document.getElementById('transmission');
                transmissionSelect.innerHTML = '<option value="">Любая КПП</option>';
                data.transmissions.forEach(tr => {
                    transmissionSelect.innerHTML += `<option value="${tr}">${tr === 'automatic' ? 'Автоматическая' : 'Механическая'}</option>`;
                });

                // Годы выпуска
                const yearSelect = document.getElementById('year');
                yearSelect.innerHTML = '<option value="">Любой год</option>';
                data.years.forEach(year => {
                    yearSelect.innerHTML += `<option value="${year}">${year}</option>`;
                });
        });
}
    
    // Проверка авторизации пользователя
    function checkAuth() {
        const token = localStorage.getItem('token');
        const authButtons = document.getElementById('auth-buttons');
        const userMenu = document.getElementById('user-menu');
        const userName = document.getElementById('user-name');
        
        if (token) {
            authButtons.classList.add('d-none');
            userMenu.classList.remove('d-none');
            
            // Получение данных пользователя
            fetch('/api/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('Ошибка авторизации');
            })
            .then(user => {
                userName.textContent = `${user.first_name} ${user.last_name}`;
            })
            .catch(error => {
                console.error('Ошибка получения профиля:', error);
                localStorage.removeItem('token');
                authButtons.classList.remove('d-none');
                userMenu.classList.add('d-none');
            });
        } else {
            authButtons.classList.remove('d-none');
            userMenu.classList.add('d-none');
        }
        
        // Обработчик выхода
        document.getElementById('logout-btn')?.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = 'index.html';
        });
    }
    
    // Загрузка автомобилей с пагинацией
    function loadCars(filters = {}, page = 1) {
        currentPage = page;
        currentFilters = filters;
        
        carsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-2">Загрузка автомобилей...</p>
            </div>
        `;
        
        let url = `/api/cars?page=${page}&limit=${carsPerPage}`;
        const params = [];
        
        if (filters.make) params.push(`make=${filters.make}`);
        if (filters.type) params.push(`type=${filters.type}`);
        if (filters.transmission) params.push(`transmission=${filters.transmission}`);
        if (filters.fuelType) params.push(`fuelType=${filters.fuelType}`);
        if (filters.minPrice) params.push(`minPrice=${filters.minPrice}`);
        if (filters.maxPrice) params.push(`maxPrice=${filters.maxPrice}`);
        if (filters.year) params.push(`year=${filters.year}`);
        
        if (params.length > 0) {
            url += '&' + params.join('&');
        }
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                allCars = data.cars;
                totalCars = data.total;
                totalPages = Math.ceil(totalCars / carsPerPage);
                
                renderCars(data.cars);
                renderPagination();
            })
            .catch(error => {
                console.error('Ошибка загрузки автомобилей:', error);
                carsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="alert alert-danger" role="alert">
                            Произошла ошибка при загрузке автомобилей. Пожалуйста, попробуйте позже.
                        </div>
                    </div>
                `;
                paginationContainer.innerHTML = '';
            });
    }
    
    // Отображение пагинации
    function renderPagination() {
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <nav aria-label="Навигация по страницам">
                <ul class="pagination justify-content-center">
                    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage - 1}" aria-label="Предыдущая">
                            <span aria-hidden="true">&laquo;</span>
                        </a>
                    </li>
        `;
        
        // Определяем диапазон страниц для отображения
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        paginationHTML += `
                    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                        <a class="page-link" href="#" data-page="${currentPage + 1}" aria-label="Следующая">
                            <span aria-hidden="true">&raquo;</span>
                        </a>
                    </li>
                </ul>
            </nav>
            <div class="text-center mt-2">
                <small class="text-muted">Показано ${(currentPage - 1) * carsPerPage + 1} - ${Math.min(currentPage * carsPerPage, totalCars)} из ${totalCars} автомобилей</small>
            </div>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
        
        // Добавляем обработчики событий для кнопок пагинации
        document.querySelectorAll('.pagination .page-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = parseInt(this.getAttribute('data-page'));
                if (page >= 1 && page <= totalPages) {
                    loadCars(currentFilters, page);
                    // Прокрутка к верху списка автомобилей
                    window.scrollTo({
                        top: document.querySelector('.cars-section').offsetTop - 100,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
    
    // Отображение автомобилей на странице
    function renderCars(cars) {
        carsContainer.innerHTML = '';
        
        if (cars.length === 0) {
            carsContainer.innerHTML = '<div class="col-12 text-center py-5"><h4>Нет автомобилей, соответствующих вашим критериям</h4></div>';
            return;
        }
        
        cars.forEach(car => {
            const typeNames = {
                'economy': 'Эконом',
                'comfort': 'Комфорт',
                'premium': 'Премиум',
                'suv': 'Внедорожник',
                'minivan': 'Минивэн'
            };
            
            const formattedPrice = new Intl.NumberFormat('ru-RU').format(car.price);
            
            carsContainer.innerHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm">
                        <div class="position-relative">
                            <img src="${car.image_url || 'https://via.placeholder.com/300x200?text=Автомобиль'}" class="card-img-top" alt="${car.make} ${car.model}">
                            <span class="position-absolute top-0 end-0 badge bg-${car.status === 'available' ? 'success' : car.status === 'reserved' ? 'warning' : 'danger'} m-2">
                                ${car.status === 'available' ? 'В наличии' : car.status === 'reserved' ? 'Зарезервирован' : 'Продан'}
                            </span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${car.make} ${car.model}</h5>
                            <p class="card-text">
                                <small class="text-muted">${car.year} год · ${typeNames[car.type] || car.type} · ${car.transmission === 'automatic' ? 'Автомат' : 'Механика'}</small>
                            </p>
                            <p class="card-text fw-bold fs-5 text-primary">${formattedPrice} ₽</p>
                            <p class="card-text"><small>Пробег: ${car.mileage} км</small></p>
                        </div>
                        <div class="card-footer bg-white border-top-0">
                            <button class="btn btn-outline-primary w-100 details-btn" data-car-id="${car.id}">Подробнее</button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Добавление обработчиков событий для кнопок "Подробнее"
        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const carId = this.getAttribute('data-car-id');
                showCarDetails(carId);
            });
        });
    }
    
    // Отображение деталей автомобиля в модальном окне
    function showCarDetails(carId) {
        const car = allCars.find(c => c.id == carId);
        
        if (!car) return;
        
        const typeNames = {
            'economy': 'Эконом',
            'comfort': 'Комфорт',
            'premium': 'Премиум',
            'suv': 'Внедорожник',
            'minivan': 'Минивэн'
        };
        
        const transmissionNames = {
            'manual': 'Механическая',
            'automatic': 'Автоматическая'
        };
        
        const fuelNames = {
            'petrol': 'Бензин',
            'diesel': 'Дизель',
            'hybrid': 'Гибрид',
            'electric': 'Электрический'
        };
        
        const formattedPrice = new Intl.NumberFormat('ru-RU').format(car.price);
        
        document.getElementById('carModalTitle').textContent = `${car.make} ${car.model}`;
        document.getElementById('carModalName').textContent = `${car.make} ${car.model} ${car.year}`;
        document.getElementById('carModalImage').src = car.image_url || 'https://via.placeholder.com/800x600?text=Автомобиль';
        document.getElementById('carModalDescription').textContent = car.description || 'Описание автомобиля отсутствует.';
        document.getElementById('carModalYear').textContent = car.year;
        document.getElementById('carModalType').textContent = typeNames[car.type] || car.type;
        document.getElementById('carModalTransmission').textContent = transmissionNames[car.transmission] || car.transmission;
        document.getElementById('carModalSeats').textContent = car.seats;
        document.getElementById('carModalFuel').textContent = fuelNames[car.fuel_type] || car.fuel_type;
        document.getElementById('carModalPrice').textContent = `${formattedPrice} ₽`;
        document.getElementById('carModalMileage').textContent = car.mileage;
        document.getElementById('carModalEngine').textContent = car.engine_volume;
        document.getElementById('carModalPower').textContent = car.engine_power;
        document.getElementById('carModalColor').textContent = car.color;
        document.getElementById('carModalVin').textContent = car.vin || 'Не указан';
        
        const testDriveBtn = document.getElementById('testDriveBtn');
        const buyCarBtn = document.getElementById('buyCarBtn');
        
        if (car.status === 'available') {
            testDriveBtn.style.display = 'inline-block';
            buyCarBtn.style.display = 'inline-block';
            
            if (localStorage.getItem('token')) {
                testDriveBtn.href = `test-drive.html?carId=${car.id}`;
                buyCarBtn.href = `buy.html?carId=${car.id}`;
            } else {
                testDriveBtn.href = `login.html?redirect=test-drive&carId=${car.id}`;
                buyCarBtn.href = `login.html?redirect=buy&carId=${car.id}`;
            }
        } else if (car.status === 'reserved') {
            testDriveBtn.style.display = 'inline-block';
            buyCarBtn.style.display = 'none';
            
            if (localStorage.getItem('token')) {
                testDriveBtn.href = `test-drive.html?carId=${car.id}`;
            } else {
                testDriveBtn.href = `login.html?redirect=test-drive&carId=${car.id}`;
            }
        } else {
            testDriveBtn.style.display = 'none';
            buyCarBtn.style.display = 'none';
        }
        
        carDetailsModal.show();
    }
    
    // Применение фильтров
    document.getElementById('apply-filters').addEventListener('click', function() {
        const filters = {
            make: document.getElementById('car-make').value,
            type: document.getElementById('car-type').value,
            transmission: document.getElementById('transmission').value,
            fuelType: document.getElementById('fuel-type').value,
            minPrice: document.getElementById('min-price').value,
            maxPrice: document.getElementById('max-price').value,
            year: document.getElementById('year').value
        };
        
        loadCars(filters, 1); // При применении фильтров всегда начинаем с первой страницы
    });
    
    // Начальная загрузка
    checkAuth();
    loadFilterOptions
    loadCars();
    
    // Проверка, нужно ли показать конкретный автомобиль (из параметра URL)
    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('id');
    if (carId) {
        fetch(`/api/cars/${carId}`)
            .then(response => response.json())
            .then(car => {
                allCars = [car];
                showCarDetails(carId);
            })
            .catch(error => console.error('Ошибка загрузки автомобиля:', error));
    }
});