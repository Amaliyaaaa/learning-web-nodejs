const form = document.getElementById('userForm');
const projectParticipantCheckbox = document.getElementById('projectParticipant');
const projectNameGroup = document.getElementById('projectNameGroup');
const resultDiv = document.getElementById('result');
const savedUsersDiv = document.getElementById('savedUsers');
const getInfoBtn = document.getElementById('getInfoBtn');
const saveBtn = document.getElementById('saveBtn');

projectParticipantCheckbox.addEventListener('change', () => {
    if (projectParticipantCheckbox.checked) projectNameGroup.classList.add('show');
    else projectNameGroup.classList.remove('show');
});

async function loadSavedUsers() {
    try {
        const response = await fetch('/api/lab8/task1');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const users = await response.json();

        savedUsersDiv.innerHTML = (!users?.length)
            ? '<p>Нет сохраненных данных</p>'
            : users.map(user => `
                <div class="data-item">
                    <strong>ID:</strong> ${user.id}<br>
                    <strong>ФИО:</strong> ${user.lastname} ${user.firstname} ${user.surname}<br>
                    <strong>Пол:</strong> ${user.gender === 'male' ? 'Мужской' : 'Женский'}<br>
                    <strong>Факультет:</strong> ${user.faculty}<br>
                    <strong>Участие в проекте:</strong> ${user.projectParticipant ? 'Да' : 'Нет'}${user.projectName ? `<br><strong>Название проекта:</strong> ${user.projectName}` : ''}
                </div>
            `).join('');
    } catch (error) {
        savedUsersDiv.innerHTML = `<p>Ошибка загрузки: ${error.message}</p>`;
    }
}

getInfoBtn.addEventListener('click', async () => {
    const lastname = form.lastname.value, firstname = form.firstname.value, surname = form.surname.value;
    if (!lastname || !firstname || !surname) {
        resultDiv.className = 'result show';
        resultDiv.innerHTML = '<h3>Ошибка</h3><p>Заполните все поля ФИО</p>';
        return;
    }

    const params = new URLSearchParams({ lastname, firstname, surname, projectParticipant: projectParticipantCheckbox.checked ? 'true' : 'false' });

    try {
        const [response1, response2] = await Promise.all([
            fetch(`/api/lab8/task1/makeInitials?${params}`),
            fetch(`/api/lab8/task1/makeProjectStatus?${params}`)
        ]);
        const [data1, data2] = await Promise.all([response1.json(), response2.json()]);
        const isOk = response1.ok && response2.ok;
        resultDiv.className = 'result show';
        resultDiv.innerHTML = isOk ? `<h3>Результаты:</h3><p><strong>Инициалы:</strong> ${data1.lastname} ${data1.firstnameLetter}.${data1.surnameLetter}.</p><p><strong>Статус проекта:</strong> ${data2.projectParticipant}</p>` : `<h3>Ошибка</h3><p>${data1.error || data2.error}</p>`;
    } catch (error) {
        resultDiv.className = 'result show';
        resultDiv.innerHTML = `<h3>Ошибка</h3><p>${error.message}</p>`;
    }
});

saveBtn.addEventListener('click', async () => {
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const formData = {
        lastname: form.lastname.value,
        firstname: form.firstname.value,
        surname: form.surname.value,
        gender: form.gender.value,
        faculty: form.faculty.value,
        projectParticipant: projectParticipantCheckbox.checked,
        projectName: projectParticipantCheckbox.checked ? form.projectName.value : undefined
    };

    try {
        const response = await fetch('/api/lab8/task1', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
        const data = await response.json();

        resultDiv.className = 'result show';
        resultDiv.innerHTML = response.ok ? `<h3>Данные успешно сохранены!</h3><p><strong>ID:</strong> ${data.id}</p>` : `<h3>Ошибка валидации</h3><p>${data.message || JSON.stringify(data)}</p>`;

        if (response.ok) {
            form.reset();
            projectNameGroup.classList.remove('show');
            await loadSavedUsers();
        }
    } catch (error) {
        resultDiv.className = 'result show';
        resultDiv.innerHTML = `<h3>Ошибка</h3><p>${error.message}</p>`;
    }
});

loadSavedUsers();
