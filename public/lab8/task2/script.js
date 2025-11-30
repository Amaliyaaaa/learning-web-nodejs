function showTab(tabName, event) {
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

async function loadData(url, containerId, renderFn) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const container = document.getElementById(containerId);
        container.innerHTML = (!data || Object.keys(data).length === 0)
            ? '<p>Данные не найдены. Убедитесь, что файл cup.txt загружен в папку data/lab8/task2/</p>'
            : renderFn(data);
    } catch (error) {
        document.getElementById(containerId).innerHTML = `<p>Ошибка: ${error.message}</p>`;
    }
}

function loadGroups() {
    loadData('/api/lab8/task2/groups', 'groups', (groups) =>
        Object.values(groups).map(group => `
    <div class="group-item">
        <h2>Группа ${group.group}</h2>
        ${group.matches?.length ? group.matches.map(match => `
            <div class="match-item">
                <strong>${match.date} ${match.time}</strong><br>
                ${match.team1} ${match.score1} - ${match.score2} ${match.team2}<br>
                <em>${match.stadium}</em>
            </div>
        `).join('') : '<p>Нет матчей</p>'}
    </div>
`).join('')
    );
}

function loadStadiums() {
    loadData('/api/lab8/task2/stadiums', 'stadiums', (stadiums) =>
        Object.values(stadiums).map(stadium => `
    <div class="stadium-item">
        <h2>${stadium.stadium}</h2>
        ${stadium.matches?.length ? stadium.matches.map(match => `
            <div class="match-item">
                <strong>Группа ${match.group}</strong> - ${match.date} ${match.time}<br>
                ${match.team1} ${match.score1} - ${match.score2} ${match.team2}
            </div>
        `).join('') : '<p>Нет матчей</p>'}
    </div>
`).join('')
    );
}

document.querySelector('.tab[onclick*="stadiums"]').addEventListener('click', () => {
    if (document.getElementById('stadiums').innerHTML.includes('Загрузка')) {
        loadStadiums();
    }
});

loadGroups();
