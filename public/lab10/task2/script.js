const API = '/api/lab10/task2';
let currentRefTab = 'departments';
let references = {};

function getAuthToken() {
  return localStorage.getItem('jwt_token');
}

function checkAuthStatus() {
  const token = getAuthToken();
  if (!token) {
    console.warn('⚠️ Токен не найден. Авторизуйтесь через lab11 как администратор.');
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    console.log('✅ Токен найден. Пользователь:', payload.login, 'Роль:', payload.role);
    
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('⚠️ Токен истек. Авторизуйтесь снова.');
      localStorage.removeItem('jwt_token');
      return null;
    }
    
    return payload;
  } catch (e) {
    console.error('Ошибка декодирования токена:', e);
    return null;
  }
}

function updateAuthStatusDisplay() {
  const statusElement = document.getElementById('auth-status-text');
  if (!statusElement) return;
  
  const authStatus = checkAuthStatus();
  if (!authStatus) {
    statusElement.textContent = '❌ Не авторизован. Авторизуйтесь через lab11 как администратор.';
    statusElement.style.color = 'red';
  } else if (authStatus.role !== 'admin') {
    statusElement.textContent = `⚠️ Авторизован как ${authStatus.login} (${authStatus.role}). Требуется роль администратора.`;
    statusElement.style.color = 'orange';
  } else {
    statusElement.textContent = `✅ Авторизован как администратор (${authStatus.login})`;
    statusElement.style.color = 'green';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  updateAuthStatusDisplay();
  setInterval(updateAuthStatusDisplay, 5000);
});

function getAuthHeaders() {
  const token = getAuthToken();
  if (!token) {
    console.warn('⚠️ Токен авторизации не найден в localStorage');
    return { 'Content-Type': 'application/json' };
  }
  console.log('✅ Токен найден, добавляю в заголовки запроса');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

const DAYS = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота'
};

const LESSON_TIMES = {
  1: '08:00-09:30',
  2: '09:45-11:15',
  3: '11:30-13:00',
  4: '13:50-15:20',
  5: '15:35-17:05',
  6: '17:20-18:50'
};

async function loadReferences() {
  try {
    const fetchReference = async (endpoint, key) => {
      const res = await fetch(`${API}/${endpoint}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error(`Invalid response format for ${endpoint}`);
      }
      return data;
    };

    references.departments = await fetchReference('departments', 'departments');
    references.positions = await fetchReference('positions', 'positions');
    references.teachers = await fetchReference('teachers', 'teachers');
    references.buildings = await fetchReference('buildings', 'buildings');
    references.classrooms = await fetchReference('classrooms', 'classrooms');
    references.subjects = await fetchReference('subjects', 'subjects');
    references.groups = await fetchReference('groups', 'groups');
    references['lesson-types'] = await fetchReference('lesson-types', 'lesson-types');

    populateFilters();
    populateAddForm();
  } catch (error) {
    console.error('Ошибка загрузки справочников:', error);
    alert(`Ошибка при загрузке справочников: ${error.message}`);
  }
}

function populateFilters() {
  const groupSelect = document.getElementById('groupFilter');
  if (!Array.isArray(references.groups)) {
    console.error('populateFilters: references.groups is not an array', references.groups);
    return;
  }
  references.groups.forEach(g => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.name;
    groupSelect.appendChild(option);
  });

  if (!Array.isArray(references.classrooms) || !Array.isArray(references.buildings)) {
    console.error('populateFilters: references.classrooms or references.buildings is not an array', references);
    return;
  }

  const classroomSelect = document.getElementById('classroomFilter');
  references.classrooms.forEach(c => {
    const building = references.buildings.find(b => b.id === c.building_id);
    const option = document.createElement('option');
    option.value = c.id;
    option.textContent = `${c.number} (${building?.name || ''})`;
    classroomSelect.appendChild(option);
  });

  if (!Array.isArray(references.subjects)) {
    console.error('populateFilters: references.subjects is not an array', references.subjects);
    return;
  }

  const subjectSelect = document.getElementById('subjectFilter');
  references.subjects.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.name;
    subjectSelect.appendChild(option);
  });

  if (!Array.isArray(references.teachers)) {
    console.error('populateFilters: references.teachers is not an array', references.teachers);
    return;
  }

  const teacherSelect = document.getElementById('teacherFilter');
  references.teachers.forEach(t => {
    const option = document.createElement('option');
    option.value = t.id;
    const name = t.full_name || `${t.lastname} ${t.firstname}${t.middlename ? ' ' + t.middlename : ''}`.trim();
    option.textContent = name;
    teacherSelect.appendChild(option);
  });

  if (!Array.isArray(references['lesson-types'])) {
    console.error('populateFilters: references.lesson-types is not an array', references['lesson-types']);
    return;
  }

  const lessonTypeSelect = document.getElementById('lessonTypeFilter');
  references['lesson-types'].forEach(lt => {
    const option = document.createElement('option');
    option.value = lt.id;
    option.textContent = lt.name;
    lessonTypeSelect.appendChild(option);
  });
}

function populateAddForm() {
  if (!Array.isArray(references.groups)) {
    console.error('populateAddForm: references.groups is not an array', references.groups);
    return;
  }

  const addGroupSelect = document.getElementById('add-group-select');
  references.groups.forEach(g => {
    const option = document.createElement('option');
    option.value = g.id;
    option.textContent = g.name;
    addGroupSelect.appendChild(option);
  });

  if (!Array.isArray(references.subjects)) {
    console.error('populateAddForm: references.subjects is not an array', references.subjects);
    return;
  }

  const addSubjectSelect = document.getElementById('add-subject-select');
  references.subjects.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = s.name;
    addSubjectSelect.appendChild(option);
  });

  if (!Array.isArray(references.teachers)) {
    console.error('populateAddForm: references.teachers is not an array', references.teachers);
    return;
  }

  const addTeacherSelect = document.getElementById('add-teacher-select');
  references.teachers.forEach(t => {
    const option = document.createElement('option');
    option.value = t.id;
    const name = t.full_name || `${t.lastname} ${t.firstname}${t.middlename ? ' ' + t.middlename : ''}`.trim();
    option.textContent = name;
    addTeacherSelect.appendChild(option);
  });

  const addTeacher2Select = document.getElementById('add-teacher2-select');
  references.teachers.forEach(t => {
    const option = document.createElement('option');
    option.value = t.id;
    const name = t.full_name || `${t.lastname} ${t.firstname}${t.middlename ? ' ' + t.middlename : ''}`.trim();
    option.textContent = name;
    addTeacher2Select.appendChild(option);
  });

  document.getElementById('add-lesson-type-select').addEventListener('change', function () {
    const isPractice = this.value === '2';
    const teacher2Label = document.getElementById('add-teacher2-label');
    const teacher2Select = document.getElementById('add-teacher2-select');
    if (isPractice) {
      teacher2Label.style.display = 'block';
    } else {
      teacher2Label.style.display = 'none';
      teacher2Select.value = '';
    }
  });

  if (!Array.isArray(references.buildings)) {
    console.error('populateAddForm: references.buildings is not an array', references.buildings);
    return;
  }

  const addBuildingSelect = document.getElementById('add-building-select');
  references.buildings.forEach(b => {
    const option = document.createElement('option');
    option.value = b.id;
    option.textContent = b.name;
    addBuildingSelect.appendChild(option);
  });

  if (!Array.isArray(references['lesson-types'])) {
    console.error('populateAddForm: references.lesson-types is not an array', references['lesson-types']);
    return;
  }

  const addLessonTypeSelect = document.getElementById('add-lesson-type-select');
  references['lesson-types'].forEach(lt => {
    const option = document.createElement('option');
    option.value = lt.id;
    option.textContent = lt.name;
    addLessonTypeSelect.appendChild(option);
  });

  if (references.buildings.length > 0) {
    loadClassroomsForAdd(references.buildings[0].id);
  }
}

async function loadClassroomsForAdd(buildingId) {
  if (!buildingId) return;

  try {
    const classrooms = await fetch(`${API}/classrooms?building_id=${buildingId}`).then(r => r.json());
    const select = document.getElementById('add-classroom-select');
    select.innerHTML = '';
    classrooms.forEach(c => {
      const option = document.createElement('option');
      option.value = c.id;
      option.textContent = c.number;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Ошибка загрузки аудиторий:', error);
  }
}

let schedule = [];

async function loadSchedule() {
  const filters = {
    group_id: document.getElementById('groupFilter').value,
    day: document.getElementById('dayFilter').value,
    classroom_id: document.getElementById('classroomFilter').value,
    subject_id: document.getElementById('subjectFilter').value,
    teacher_id: document.getElementById('teacherFilter').value,
    lesson_type_id: document.getElementById('lessonTypeFilter').value
  };

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  try {
    const res = await fetch(`${API}/schedule?${params}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${res.status}`);
    }

    schedule = await res.json();

    if (!Array.isArray(schedule)) {
      throw new Error('Invalid response format');
    }

    displaySchedule(schedule);
  } catch (error) {
    console.error('Ошибка загрузки расписания:', error);
    document.getElementById('schedule-list').innerHTML = `<p style="color: red;">Ошибка при загрузке расписания: ${error.message}</p>`;
  }
}

function displaySchedule(schedule) {
  if (!Array.isArray(schedule)) {
    console.error('displaySchedule: schedule is not an array', schedule);
    document.getElementById('schedule-list').innerHTML = '<p style="color: red;">Ошибка: неверный формат данных</p>';
    return;
  }

  if (schedule.length === 0) {
    document.getElementById('schedule-list').innerHTML = '<p>Расписание не найдено</p>';
    return;
  }

  const groupedByDay = {};
  schedule.forEach(s => {
    const day = s.day_of_week;
    if (!groupedByDay[day]) {
      groupedByDay[day] = [];
    }
    groupedByDay[day].push(s);
  });

  let html = '';
  Object.keys(groupedByDay).sort().forEach(day => {
    const dayName = DAYS[day] || `День ${day}`;
    const lessons = groupedByDay[day].sort((a, b) => a.lesson_number - b.lesson_number);

    html += `<h3>${dayName}</h3>`;
    html += `
      <table class="schedule-table">
        <thead>
          <tr>
            <th>Пара</th>
            <th>Время</th>
            <th>Группа</th>
            <th>Дисциплина</th>
            <th>Преподаватель</th>
            <th>Аудитория</th>
            <th>Тип</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${lessons.map(s => `
            <tr>
              <td>${s.lesson_number}</td>
              <td>${LESSON_TIMES[s.lesson_number] || '-'}</td>
              <td>${s.group_name || '-'}</td>
              <td>${s.subject_name || '-'}</td>
              <td>${s.teacher_name || '-'}</td>
              <td>${s.classroom_number || '-'} ${s.building_name ? `(${s.building_name})` : ''}</td>
              <td>${s.lesson_type_name || '-'}</td>
            <td>
              <button onclick="showEditScheduleForm(${s.id})">Редактировать</button>
              <button onclick="deleteSchedule(${s.id})" class="btn-danger">Удалить</button>
            </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  });

  document.getElementById('schedule-list').innerHTML = html;
}

async function deleteSchedule(id) {
  if (!confirm('Удалить занятие?')) return;

  try {
    const res = await fetch(`${API}/schedule/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (res.ok) {
      loadSchedule();
    } else {
      const error = await res.json().catch(() => ({ error: 'Ошибка при удалении' }));
      alert(`Ошибка: ${error.error || 'Ошибка при удалении'}`);
    }
  } catch (error) {
    console.error('Ошибка удаления:', error);
    alert('Ошибка при удалении');
  }
}

function clearFilters() {
  document.getElementById('groupFilter').value = '';
  document.getElementById('dayFilter').value = '';
  document.getElementById('classroomFilter').value = '';
  document.getElementById('subjectFilter').value = '';
  document.getElementById('teacherFilter').value = '';
  document.getElementById('lessonTypeFilter').value = '';
  loadSchedule();
}

function showAddScheduleForm() {
  document.getElementById('add-schedule-modal').style.display = 'block';
  document.getElementById('add-schedule-form').reset();
}

async function showEditScheduleForm(id) {
  const scheduleItem = schedule.find(s => s.id === id);
  if (!scheduleItem) return;

  document.getElementById('add-schedule-form').querySelector('[name="day_of_week"]').value = scheduleItem.day_of_week;
  document.getElementById('add-schedule-form').querySelector('[name="lesson_number"]').value = scheduleItem.lesson_number;
  document.getElementById('add-group-select').value = scheduleItem.group_id;
  document.getElementById('add-subject-select').value = scheduleItem.subject_id;

  const res = await fetch(`${API}/schedule/${id}`);
  const fullScheduleItem = await res.json();
  const teacherIds = fullScheduleItem.teacher_ids || (fullScheduleItem.teacher_id ? [fullScheduleItem.teacher_id] : []);

  if (teacherIds.length > 0) {
    document.getElementById('add-teacher-select').value = teacherIds[0];
  }
  if (teacherIds.length > 1) {
    document.getElementById('add-teacher2-select').value = teacherIds[1];
  } else {
    document.getElementById('add-teacher2-select').value = '';
  }

  const classroom = references.classrooms.find(c => c.id === scheduleItem.classroom_id);
  if (classroom) {
    document.getElementById('add-building-select').value = classroom.building_id;
    loadClassroomsForAdd(classroom.building_id);
    setTimeout(() => {
      document.getElementById('add-classroom-select').value = scheduleItem.classroom_id;
    }, 100);
  }

  document.getElementById('add-lesson-type-select').value = scheduleItem.lesson_type_id;

  const isPractice = scheduleItem.lesson_type_id === 2;
  const teacher2Label = document.getElementById('add-teacher2-label');
  if (isPractice) {
    teacher2Label.style.display = 'block';
  } else {
    teacher2Label.style.display = 'none';
  }

  document.getElementById('add-schedule-form').dataset.editId = id;
  document.getElementById('add-schedule-modal').querySelector('h2').textContent = 'Редактировать занятие';
  document.getElementById('add-schedule-modal').style.display = 'block';
}

function closeAddScheduleModal() {
  document.getElementById('add-schedule-modal').style.display = 'none';
  document.getElementById('add-schedule-form').reset();
  document.getElementById('add-teacher2-label').style.display = 'none';
  delete document.getElementById('add-schedule-form').dataset.editId;
  document.getElementById('add-schedule-modal').querySelector('h2').textContent = 'Добавить занятие';
}

document.getElementById('add-schedule-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const editId = e.target.dataset.editId;
  const lessonTypeId = parseInt(formData.get('lesson_type_id'));
  const teacherId = parseInt(formData.get('teacher_id'));
  const teacherId2 = formData.get('teacher_id2') ? parseInt(formData.get('teacher_id2')) : null;

  const teacherIds = [teacherId];
  if (lessonTypeId === 2 && teacherId2 && teacherId2 !== teacherId) {
    teacherIds.push(teacherId2);
  }

  const data = {
    week: null,
    day_of_week: parseInt(formData.get('day_of_week')),
    lesson_number: parseInt(formData.get('lesson_number')),
    group_id: parseInt(formData.get('group_id')),
    subject_id: parseInt(formData.get('subject_id')),
    teacher_id: teacherId,
    teacher_ids: teacherIds,
    classroom_id: parseInt(formData.get('classroom_id')),
    lesson_type_id: lessonTypeId
  };

  try {
    const url = editId ? `${API}/schedule/${editId}` : `${API}/schedule`;
    const method = editId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });

    if (res.ok) {
      closeAddScheduleModal();
      loadSchedule();
    } else {
      const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      console.error('Ошибка ответа:', error, 'Status:', res.status, 'URL:', url);
      if (res.status === 401) {
        alert('Ошибка: Не авторизован. Пожалуйста, войдите через lab11 как администратор.');
      } else if (res.status === 403) {
        alert('Ошибка: Доступ запрещен. Требуется роль администратора.');
      } else {
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    }
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    alert('Ошибка при сохранении занятия');
  }
});

function showRefTab(tab) {
  currentRefTab = tab;
  document.querySelectorAll('.ref-tabs button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');

  loadRefTab(tab);
}

async function loadRefTab(tab) {
  const items = references[tab] || [];
  const tabNames = {
    'departments': 'Кафедры',
    'positions': 'Должности',
    'teachers': 'Преподаватели',
    'buildings': 'Корпуса',
    'classrooms': 'Аудитории',
    'subjects': 'Дисциплины',
    'groups': 'Группы',
    'lesson-types': 'Типы занятий'
  };

  let html = `<h2>${tabNames[tab]}</h2>`;
  html += `<button onclick="showAddRefForm('${tab}')">Добавить</button>`;
  html += '<div class="ref-list">';

  if (tab === 'teachers') {
    items.forEach(item => {
      const name = item.full_name || `${item.lastname} ${item.firstname}${item.middlename ? ' ' + item.middlename : ''}`.trim();
      html += `
        <div class="ref-item">
          <div>
            <strong>${name}</strong>
          </div>
          <div>
            <button onclick="showEditRefForm('${tab}', ${item.id})">Редактировать</button>
            <button onclick="deleteRefItem('${tab}', ${item.id})" class="btn-danger">Удалить</button>
          </div>
        </div>
      `;
    });
  } else if (tab === 'classrooms') {
    items.forEach(item => {
      const building = references.buildings.find(b => b.id === item.building_id);
      html += `
        <div class="ref-item">
          <div>
            <strong>${item.number}</strong><br>
            <small>${building?.name || ''}</small>
          </div>
          <div>
            <button onclick="showEditRefForm('${tab}', ${item.id})">Редактировать</button>
            <button onclick="deleteRefItem('${tab}', ${item.id})" class="btn-danger">Удалить</button>
          </div>
        </div>
      `;
    });
  } else {
    items.forEach(item => {
      html += `
        <div class="ref-item">
          <div><strong>${item.name}</strong></div>
          <div>
            <button onclick="showEditRefForm('${tab}', ${item.id})">Редактировать</button>
            <button onclick="deleteRefItem('${tab}', ${item.id})" class="btn-danger">Удалить</button>
          </div>
        </div>
      `;
    });
  }

  html += '</div>';
  document.getElementById('ref-content').innerHTML = html;
}

function showAddRefForm(tab) {
  if (tab === 'teachers') {
    showEditTeacherForm(null);
  } else if (tab === 'classrooms') {
    showEditClassroomForm(null);
  } else {
    const name = prompt('Введите название:');
    if (!name) return;

    const endpoints = {
      'departments': 'departments',
      'positions': 'positions',
      'buildings': 'buildings',
      'subjects': 'subjects',
      'groups': 'groups',
      'lesson-types': 'lesson-types'
    };

    if (endpoints[tab]) {
      fetch(`${API}/${endpoints[tab]}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      })
        .then(r => r.json())
        .then(() => {
          loadReferences();
          loadRefTab(tab);
        })
        .catch(err => {
          console.error('Ошибка добавления:', err);
          alert('Ошибка при добавлении');
        });
    }
  }
}

function showEditRefForm(tab, id) {
  if (tab === 'teachers') {
    showEditTeacherForm(id);
  } else if (tab === 'classrooms') {
    showEditClassroomForm(id);
  } else {
    const item = references[tab].find(i => i.id === id);
    if (!item) return;

    const name = prompt('Введите новое название:', item.name);
    if (!name || name === item.name) return;

    const endpoints = {
      'departments': 'departments',
      'positions': 'positions',
      'buildings': 'buildings',
      'subjects': 'subjects',
      'groups': 'groups',
      'lesson-types': 'lesson-types'
    };

    if (endpoints[tab]) {
      fetch(`${API}/${endpoints[tab]}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      })
        .then(r => {
          if (!r.ok) throw new Error('Ошибка обновления');
          return r.json();
        })
        .then(() => {
          loadReferences();
          loadRefTab(tab);
        })
        .catch(err => {
          console.error('Ошибка обновления:', err);
          alert('Ошибка при обновлении');
        });
    }
  }
}

async function deleteRefItem(tab, id) {
  if (!confirm('Удалить запись?')) return;

  const endpoints = {
    'departments': 'departments',
    'positions': 'positions',
    'teachers': 'teachers',
    'buildings': 'buildings',
    'classrooms': 'classrooms',
    'subjects': 'subjects',
    'groups': 'groups',
    'lesson-types': 'lesson-types'
  };

  if (endpoints[tab]) {
    try {
      const res = await fetch(`${API}/${endpoints[tab]}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        loadReferences();
        loadRefTab(tab);
      } else {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка при удалении');
    }
  }
}

function showEditTeacherForm(id) {
  const teacher = id ? references.teachers.find(t => t.id === id) : null;
  const formHtml = `
    <h2>${teacher ? 'Редактировать' : 'Добавить'} преподавателя</h2>
    <form id="edit-teacher-form">
      <label>Фамилия: <input type="text" name="lastname" value="${teacher?.lastname || ''}" required></label>
      <label>Имя: <input type="text" name="firstname" value="${teacher?.firstname || ''}" required></label>
      <label>Отчество: <input type="text" name="middlename" value="${teacher?.middlename || ''}"></label>
      <label>Кафедра:
        <select name="department_id" required>
          <option value="">Выберите кафедру</option>
          ${references.departments.map(d => `<option value="${d.id}" ${teacher?.department_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
      </label>
      <label>Должность:
        <select name="position_id" required>
          <option value="">Выберите должность</option>
          ${references.positions.map(p => `<option value="${p.id}" ${teacher?.position_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </label>
      <button type="submit">Сохранить</button>
      <button type="button" onclick="closeEditModal()">Отмена</button>
    </form>
  `;
  document.getElementById('edit-modal-content').innerHTML = formHtml;
  document.getElementById('edit-modal').style.display = 'block';

  document.getElementById('edit-teacher-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      lastname: formData.get('lastname'),
      firstname: formData.get('firstname'),
      middlename: formData.get('middlename') || null,
      department_id: parseInt(formData.get('department_id')),
      position_id: parseInt(formData.get('position_id'))
    };

    try {
      const url = id ? `${API}/teachers/${id}` : `${API}/teachers`;
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (res.ok) {
        closeEditModal();
        loadReferences();
        loadRefTab('teachers');
      } else {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении');
    }
  });
}

function showEditClassroomForm(id) {
  const classroom = id ? references.classrooms.find(c => c.id === id) : null;
  const formHtml = `
    <h2>${classroom ? 'Редактировать' : 'Добавить'} аудиторию</h2>
    <form id="edit-classroom-form">
      <label>Номер: <input type="text" name="number" value="${classroom?.number || ''}" required></label>
      <label>Корпус:
        <select name="building_id" required>
          <option value="">Выберите корпус</option>
          ${references.buildings.map(b => `<option value="${b.id}" ${classroom?.building_id === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
        </select>
      </label>
      <button type="submit">Сохранить</button>
      <button type="button" onclick="closeEditModal()">Отмена</button>
    </form>
  `;
  document.getElementById('edit-modal-content').innerHTML = formHtml;
  document.getElementById('edit-modal').style.display = 'block';

  document.getElementById('edit-classroom-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      number: formData.get('number'),
      building_id: parseInt(formData.get('building_id'))
    };

    try {
      const url = id ? `${API}/classrooms/${id}` : `${API}/classrooms`;
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });

      if (res.ok) {
        closeEditModal();
        loadReferences();
        loadRefTab('classrooms');
      } else {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Ошибка при сохранении');
    }
  });
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  document.getElementById('edit-modal-content').innerHTML = '';
}

function showSection(section) {
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');

  if (section === 'schedule') {
    document.getElementById('schedule-section').style.display = 'block';
    loadSchedule();
  } else if (section === 'references') {
    document.getElementById('references-section').style.display = 'block';
    loadRefTab(currentRefTab);
  }
}

loadReferences();
loadSchedule();

