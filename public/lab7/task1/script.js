'use strict';

document.getElementById('calcBtn').addEventListener('click', async () => {
    const a = document.getElementById('a').value;
    const b = document.getElementById('b').value;
    const operation = document.getElementById('operation').value;
    const resultEl = document.getElementById('result');

    if (!a || !b) {
        resultEl.textContent = 'Введите оба числа';
        return;
    }

    try {
        const res = await fetch(`/api/lab7/calc?operation=${operation}&a=${a}&b=${b}`);
        const data = await res.json();

        if (data.error) {
            resultEl.textContent = 'Ошибка: ' + data.error;
        } else {
            resultEl.textContent = `Результат: ${data.result}`;
        }
    } catch (err) {
        resultEl.textContent = 'Ошибка запроса: ' + err.message;
    }
});
