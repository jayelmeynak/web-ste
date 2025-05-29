// public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    const featuredCarsContainer = document.getElementById('featured-cars');
    
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
    
    // Загрузка популярных автомобилей
    function loadFeaturedCars() {
        if (!featuredCarsContainer) return;
        
        featuredCarsContainer.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
                <p class="mt-2">Загрузка автомобилей...</p>
            </div>
        `;
        
        fetch('/api/cars?limit=3')
            .then(response => response.json())
            .then(cars => {
                renderFeaturedCars(cars);
            })
            .catch(error => {
                console.error('Ошибка загрузки автомобилей:', error);
                featuredCarsContainer.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <div class="alert alert-danger" role="alert">
                            Произошла ошибка при загрузке автомобилей. Пожалуйста, попробуйте позже.
                        </div>
                    </div>
                `;
            });
    }
    
    // Отображение популярных автомобилей
    function renderFeaturedCars(cars) {
        featuredCarsContainer.innerHTML = '';
        
        if (cars.length === 0) {
            featuredCarsContainer.innerHTML = '<div class="col-12 text-center py-5"><h4>Нет доступных автомобилей</h4></div>';
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
            
            featuredCarsContainer.innerHTML += `
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
                            <a href="cars.html?id=${car.id}" class="btn btn-outline-primary w-100">Подробнее</a>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    // Инициализация
    checkAuth();
    loadFeaturedCars();
});