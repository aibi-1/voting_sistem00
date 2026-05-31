// Конфигурация JSONBin.io
// 1. Зарегистрируйся на https://jsonbin.io
// 2. Создай бин с начальными данными
// 3. Вставь свои ключи ниже

const API_CONFIG = {
    BIN_ID: 'ТВОЙ_BIN_ID',        // ID бина из jsonbin.io
    API_KEY: 'ТВОЙ_API_KEY',       // API ключ из jsonbin.io
    BASE_URL: 'https://api.jsonbin.io/v3/b'
};

// Альтернативно: если нет jsonbin, используем localStorage + синхронизацию через BroadcastChannel (для тестов)

// Флаг использования демо-режима (если нет API)
const USE_DEMO_MODE = true;  // Включи демо-режим для локального тестирования

// Начальные данные
const DEFAULT_DATA = {
    question: "Какой формат выпускного вы выбираете?",
    options: [
        { id: 1, text: "🍽️ Ресторан", votes: 0 },
        { id: 2, text: "🌳 Пикник в парке", votes: 0 },
        { id: 3, text: "🔍 Квест по городу", votes: 0 },
        { id: 4, text: "🎬 Кинотеатр + пицца", votes: 0 }
    ],
    total_votes: 0,
    updated_at: new Date().toISOString()
};

// ========== РАБОТА С ДАННЫМИ ==========

async function fetchData() {
    if (USE_DEMO_MODE) {
        // Демо-режим: читаем из localStorage
        const saved = localStorage.getItem('poll_data');
        if (saved) {
            return JSON.parse(saved);
        }
        return { ...DEFAULT_DATA };
    }
    
    // Реальный API запрос к jsonbin.io
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/${API_CONFIG.BIN_ID}/latest`, {
            headers: {
                'X-Master-Key': API_CONFIG.API_KEY
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const result = await response.json();
        return result.record;
    } catch (error) {
        console.error('Ошибка API:', error);
        // Фолбэк на localStorage
        const saved = localStorage.getItem('poll_data');
        if (saved) return JSON.parse(saved);
        return { ...DEFAULT_DATA };
    }
}

async function saveData(data) {
    if (USE_DEMO_MODE) {
        // Демо-режим: сохраняем в localStorage
        localStorage.setItem('poll_data', JSON.stringify(data));
        return true;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/${API_CONFIG.BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': API_CONFIG.API_KEY
            },
            body: JSON.stringify(data)
        });
        
        return response.ok;
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        return false;
    }
}

// ========== ЛОГИКА ГОЛОСОВАНИЯ ==========

async function submitVote(optionId) {
    // Проверка на повторное голосование
    if (localStorage.getItem('hasVoted') === 'true') {
        showMessage('❌ Вы уже голосовали!', 'error');
        return false;
    }
    
    // Загружаем текущие данные
    const data = await fetchData();
    
    // Находим вариант
    const option = data.options.find(opt => opt.id === optionId);
    if (!option) return false;
    
    // Увеличиваем голоса
    option.votes++;
    data.total_votes++;
    data.updated_at = new Date().toISOString();
    
    // Сохраняем
    const saved = await saveData(data);
    
    if (saved) {
        // Отмечаем что пользователь проголосовал
        localStorage.setItem('hasVoted', 'true');
        localStorage.setItem('votedFor', optionId);
        
        showMessage(`✅ Спасибо! Ваш голос за "${option.text}" принят`, 'success');
        
        // Показываем текущие результаты
        showResultsPreview(data);
        
        return true;
    } else {
        showMessage('❌ Ошибка сохранения. Попробуйте ещё раз', 'error');
        return false;
    }
}

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `text-center text-sm font-medium p-3 rounded-xl mt-4 ${
        type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
    }`;
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 4000);
}

function showResultsPreview(data) {
    const previewDiv = document.getElementById('resultsPreview');
    const statsDiv = document.getElementById('previewStats');
    
    if (!previewDiv || !statsDiv) return;
    
    const total = data.total_votes;
    
    statsDiv.innerHTML = data.options.map(opt => {
        const percent = total > 0 ? ((opt.votes / total) * 100).toFixed(1) : 0;
        return `
            <div class="flex justify-between items-center">
                <span class="text-gray-600">${opt.text}</span>
                <span class="font-medium text-gray-800">${opt.votes} (${percent}%)</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5">
                <div class="bg-indigo-600 h-1.5 rounded-full" style="width: ${percent}%"></div>
            </div>
        `;
    }).join('');
    
    previewDiv.classList.remove('hidden');
}

// ========== ЗАГРУЗКА СТРАНИЦЫ ==========

async function loadPage() {
    const data = await fetchData();
    
    // Вопрос
    const questionEl = document.getElementById('questionText');
    if (questionEl) questionEl.textContent = data.question;
    
    // Кнопки вариантов
    const container = document.getElementById('optionsContainer');
    if (container) {
        container.innerHTML = data.options.map(opt => `
            <button class="vote-btn w-full bg-white border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl p-4 text-left font-medium text-gray-700 transition flex justify-between items-center group">
                <span>${opt.text}</span>
                <span class="text-indigo-400 opacity-0 group-hover:opacity-100 transition">→</span>
            </button>
        `).join('');
        
        // Добавляем обработчики
        document.querySelectorAll('.vote-btn').forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const optionId = data.options[index].id;
                submitVote(optionId);
            });
        });
    }
    
    // Если уже голосовал, показываем результаты
    if (localStorage.getItem('hasVoted') === 'true') {
        showResultsPreview(data);
    }
}

// Запуск
loadPage();