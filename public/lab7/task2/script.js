'use strict';

const projectCheckbox = document.getElementById('project');
const projectNameInput = document.getElementById('projectName');
const resultDiv = document.getElementById('result');
const projectStatusBtn = document.getElementById('projectStatusBtn');

// Показ/скрытие поля проекта
projectCheckbox.addEventListener('change', () => {
    projectNameInput.style.display = projectCheckbox.checked ? 'inline-block' : 'none';
});

// Обработка клика "Проверить статус участия"
projectStatusBtn.addEventListener('click', async () => {
    const lastname = document.getElementById('lastname').value.trim();
    const firstname = document.getElementById('firstname').value.trim();
    const surname = document.getElementById('surname').value.trim();
    const isProject = projectCheckbox.checked;

    if (!lastname || !firstname || !surname) {
        alert('Заполните ФИО');
        return;
    }

    try {
        const params = new URLSearchParams({
            lastname,
            firstname,
            surname,
            project: isProject
        });

        const res = await fetch(`/api/lab7/task2/makeProjectStatus?${params}`);
        if (!res.ok) throw new Error('Ошибка сети');
        const data = await res.json();

        resultDiv.innerHTML = `
      <p><strong>${data.lastname} ${data.firstnameLetter}.${data.surnameLetter}.</strong></p>
      <p>Статус участия: <strong>${data.projectParticipant}</strong></p>
    `;
    } catch (err) {
        resultDiv.textContent = 'Ошибка: ' + err.message;
    }
});
