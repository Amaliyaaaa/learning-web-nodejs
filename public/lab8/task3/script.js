async function loadResults() {
    try {
        const response = await fetch("/api/lab8/task3/results");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const matches = await response.json();
        const container = document.getElementById("table-container");

        if (!matches?.length) {
            container.innerHTML = "<p>Данные не найдены. Убедитесь, что файл cup.txt обработан.</p>";
            return;
        }

        const getRowClass = (score1, score2) =>
            score1 > score2 ? "team1-win" : score2 > score1 ? "team2-win" : "draw";

        container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Группа</th>
              <th>Дата</th>
              <th>Время</th>
              <th>Команда 1</th>
              <th>Итоговый счет</th>
              <th>Команда 2</th>
              <th>Стадион</th>
            </tr>
          </thead>
          <tbody>
            ${matches.map(match => `
              <tr class="${getRowClass(match.score1, match.score2)}">
                <td>${match.group}</td>
                <td>${match.date}</td>
                <td>${match.time}</td>
                <td>${match.team1}</td>
                <td><strong>${match.score1} - ${match.score2}</strong></td>
                <td>${match.team2}</td>
                <td>${match.stadium}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (error) {
        document.getElementById("table-container").innerHTML = `<p class="loading">Ошибка: ${error.message}</p>`;
    }
}

loadResults();