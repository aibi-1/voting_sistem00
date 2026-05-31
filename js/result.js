// Те же конфиги, что и в app.js
const USE_DEMO_MODE = true;

let chart = null;



async function fetchResults() {
    if (USE_DEMO_MODE) {
        const saved = localStorage.getItem('poll_data');
        if (saved) return JSON.parse(saved);
        return {
            total_votes: 0,
            options: [
                { id: 1, text: "Ресторан", votes: 0 },
                { id: 2, text: "Пикник в парке", votes: 0 },
                { id: 3, text: "Квест по городу", votes: 0 },
                { id: 4, text: "Кинотеатр + пицца", votes: 0 }
            ]
        };
    }
    
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${API_CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': API_CONFIG.API_KEY }
        });
        const result = await response.json();
        return result.record;
    } catch (error) {
        console.error('Ошибка:', error);
        return null;
    }
}

function updateUI(data) {
    if (!data) return;
    
    // Общее количество
    document.getElementById('totalVotes').textContent = data.total_votes || 0;
    
    // Статистика по вариантам
    const total = data.total_votes || 0;
    const statsContainer = document.getElementById('optionsStats');
    
    if (statsContainer) {
        statsContainer.innerHTML = data.options.map(opt => {
            const percent = total > 0 ? ((opt.votes / total) * 100).toFixed(1) : 0;
            return `
                <div>
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-indigo-200">${opt.text}</span>
                        <span class="text-white font-medium">${opt.votes} (${percent}%)</span>
                    </div>
                    <div class="w-full bg-white/20 rounded-full h-2">
                        <div class="bg-indigo-400 h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Обновляем диаграмму
    if (chart) {
        chart.data.datasets[0].data = data.options.map(opt => opt.votes);
        chart.data.labels = data.options.map(opt => opt.text);
        chart.update();
    } else {
        // Создаём диаграмму
        const ctx = document.getElementById('votesChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.options.map(opt => opt.text),
                datasets: [{
                    label: 'Голоса',
                    data: data.options.map(opt => opt.votes),
                    backgroundColor: ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc'],
                    borderRadius: 8,
                    barPercentage: 0.6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { labels: { color: 'white', font: { size: 12 } } }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { color: 'white', stepSize: 1 },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: { ticks: { color: 'white', font: { size: 11 } } }
                }
            }
        });
    }
}

let lastUpdate = null;

async function refreshData() {
    const data = await fetchResults();
    
    // Проверяем, изменились ли данные
    if (data && JSON.stringify(data) !== lastUpdate) {
        updateUI(data);
        lastUpdate = JSON.stringify(data);
    }
}


// Добавь в начало results.js, после объявления переменных

// ФОРСИРОВАННЫЕ ТЕСТОВЫЕ ДАННЫЕ (уберешь потом)
const TEST_DATA = {
    total_votes: 124,
    options: [
        { id: 1, text: "🍽️ Ресторан", votes: 45 },
        { id: 2, text: "🌳 Пикник в парке", votes: 32 },
        { id: 3, text: "🔍 Квест по городу", votes: 28 },
        { id: 4, text: "🎬 Кинотеатр + пицца", votes: 19 }
    ]
};

// Временно показываем тестовые данные
updateUI(TEST_DATA);

// Запускаем обновление каждые 3 секунды
refreshData();
setInterval(refreshData, 3000);