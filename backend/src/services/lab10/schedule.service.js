// backend/src/services/lab10/schedule.service.js
class ScheduleService {
  async getDepartments(db) {
    const { rows } = await db.query('SELECT * FROM lab10.departments ORDER BY name');
    return rows;
  }

  async getPositions(db) {
    const { rows } = await db.query('SELECT * FROM lab10.positions ORDER BY name');
    return rows;
  }

  async getTeachers(db) {
    const query = `
      SELECT 
        t.*, 
        d.name as department_name, 
        pos.name as position_name,
        t.lastname || ' ' || t.firstname || COALESCE(' ' || t.middlename, '') as full_name
      FROM lab10.teachers t
      LEFT JOIN lab10.departments d ON t.department_id = d.id
      LEFT JOIN lab10.positions pos ON t.position_id = pos.id
      ORDER BY t.lastname, t.firstname
    `;
    const { rows } = await db.query(query);
    return rows;
  }

  async getBuildings(db) {
    const { rows } = await db.query('SELECT * FROM lab10.buildings ORDER BY name');
    return rows;
  }

  async getClassrooms(db, buildingId = null) {
    let query = 'SELECT * FROM lab10.classrooms';
    const values = [];

    if (buildingId) {
      values.push(buildingId);
      query += ' WHERE building_id = $1';
    }

    query += ' ORDER BY number';
    const { rows } = await db.query(query, values);
    return rows;
  }

  async getSubjects(db) {
    const { rows } = await db.query('SELECT * FROM lab10.subjects ORDER BY name');
    return rows;
  }

  async getGroups(db) {
    const { rows } = await db.query('SELECT * FROM lab10.groups ORDER BY name');
    return rows;
  }

  async getLessonTypes(db) {
    const { rows } = await db.query('SELECT * FROM lab10.lesson_types ORDER BY name');
    return rows;
  }

  async getSchedule(db, filters = {}) {
    const {
      week,
      groupId,
      day,
      classroomId,
      subjectId,
      teacherId,
      lessonTypeId
    } = filters;

    const conditions = [];
    const values = [];

    if (week) {
      values.push(week);
      conditions.push(`s.week = $${values.length}`);
    }

    if (groupId) {
      values.push(groupId);
      conditions.push(`s.group_id = $${values.length}`);
    }

    if (day !== undefined && day !== null && day !== '') {
      values.push(parseInt(day));
      conditions.push(`s.day_of_week = $${values.length}`);
    }

    if (classroomId) {
      values.push(classroomId);
      conditions.push(`s.classroom_id = $${values.length}`);
    }

    if (subjectId) {
      values.push(subjectId);
      conditions.push(`s.subject_id = $${values.length}`);
    }

    if (teacherId) {
      values.push(teacherId);
      conditions.push(`EXISTS (SELECT 1 FROM lab10.schedule_teachers st WHERE st.schedule_id = s.id AND st.teacher_id = $${values.length})`);
    }

    if (lessonTypeId) {
      values.push(lessonTypeId);
      conditions.push(`s.lesson_type_id = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const query = `
      SELECT 
        s.*,
        g.name as group_name,
        sub.name as subject_name,
        STRING_AGG(
          CASE 
            WHEN t.middlename IS NOT NULL AND t.middlename != '' 
            THEN t.lastname || ' ' || t.firstname || ' ' || t.middlename
            ELSE t.lastname || ' ' || t.firstname
          END,
          ', '
          ORDER BY t.lastname, t.firstname
        ) as teacher_name,
        c.number as classroom_number,
        b.name as building_name,
        lt.name as lesson_type_name
      FROM lab10.schedule s
      LEFT JOIN lab10.groups g ON s.group_id = g.id
      LEFT JOIN lab10.subjects sub ON s.subject_id = sub.id
      LEFT JOIN lab10.schedule_teachers st ON s.id = st.schedule_id
      LEFT JOIN lab10.teachers t ON st.teacher_id = t.id
      LEFT JOIN lab10.classrooms c ON s.classroom_id = c.id
      LEFT JOIN lab10.buildings b ON c.building_id = b.id
      LEFT JOIN lab10.lesson_types lt ON s.lesson_type_id = lt.id
      ${whereClause}
      GROUP BY s.id, g.name, sub.name, c.number, b.name, lt.name, s.week, s.day_of_week, s.lesson_number, s.group_id, s.subject_id, s.classroom_id, s.lesson_type_id
      ORDER BY s.day_of_week, s.lesson_number
    `;

    const { rows } = await db.query(query, values);
    return rows;
  }

  async getScheduleById(db, id) {
    const query = `
      SELECT 
        s.*,
        g.name as group_name,
        sub.name as subject_name,
        STRING_AGG(
          CASE 
            WHEN t.middlename IS NOT NULL AND t.middlename != '' 
            THEN t.lastname || ' ' || t.firstname || ' ' || t.middlename
            ELSE t.lastname || ' ' || t.firstname
          END,
          ', '
          ORDER BY t.lastname, t.firstname
        ) as teacher_name,
        ARRAY_AGG(st.teacher_id ORDER BY t.lastname, t.firstname) as teacher_ids,
        c.number as classroom_number,
        b.name as building_name,
        lt.name as lesson_type_name
      FROM lab10.schedule s
      LEFT JOIN lab10.groups g ON s.group_id = g.id
      LEFT JOIN lab10.subjects sub ON s.subject_id = sub.id
      LEFT JOIN lab10.schedule_teachers st ON s.id = st.schedule_id
      LEFT JOIN lab10.teachers t ON st.teacher_id = t.id
      LEFT JOIN lab10.classrooms c ON s.classroom_id = c.id
      LEFT JOIN lab10.buildings b ON c.building_id = b.id
      LEFT JOIN lab10.lesson_types lt ON s.lesson_type_id = lt.id
      WHERE s.id = $1
      GROUP BY s.id, g.name, sub.name, c.number, b.name, lt.name, s.week, s.day_of_week, s.lesson_number, s.group_id, s.subject_id, s.classroom_id, s.lesson_type_id, s.teacher_id
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  async createSchedule(db, scheduleData) {
    const {
      week,
      day_of_week,
      lesson_number,
      group_id,
      subject_id,
      teacher_id,
      teacher_ids,
      classroom_id,
      lesson_type_id
    } = scheduleData;

    const teacherIds = teacher_ids || (teacher_id ? [teacher_id] : []);

    const query = `
      INSERT INTO lab10.schedule 
      (week, day_of_week, lesson_number, group_id, subject_id, teacher_id, classroom_id, lesson_type_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const { rows } = await db.query(query, [
      week,
      day_of_week,
      lesson_number,
      group_id,
      subject_id,
      teacherIds[0] || null,
      classroom_id,
      lesson_type_id
    ]);

    const scheduleId = rows[0].id;

    if (teacherIds.length > 0) {
      const insertTeachers = teacherIds.map((tid, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(', ');
      const values = teacherIds.flatMap(tid => [scheduleId, tid]);
      await db.query(
        `INSERT INTO lab10.schedule_teachers (schedule_id, teacher_id) VALUES ${insertTeachers} ON CONFLICT DO NOTHING`,
        values
      );
    }

    return rows[0];
  }

  async updateSchedule(db, id, scheduleData) {
    const {
      week,
      day_of_week,
      lesson_number,
      group_id,
      subject_id,
      teacher_id,
      teacher_ids,
      classroom_id,
      lesson_type_id
    } = scheduleData;

    const teacherIds = teacher_ids || (teacher_id ? [teacher_id] : []);

    const query = `
      UPDATE lab10.schedule
      SET week = $1, day_of_week = $2, lesson_number = $3, group_id = $4,
          subject_id = $5, teacher_id = $6, classroom_id = $7, lesson_type_id = $8
      WHERE id = $9
      RETURNING *
    `;

    const { rows } = await db.query(query, [
      week,
      day_of_week,
      lesson_number,
      group_id,
      subject_id,
      teacherIds[0] || null,
      classroom_id,
      lesson_type_id,
      id
    ]);

    if (rows.length === 0) {
      return null;
    }

    await db.query('DELETE FROM lab10.schedule_teachers WHERE schedule_id = $1', [id]);

    if (teacherIds.length > 0) {
      const insertTeachers = teacherIds.map((tid, idx) => `($${idx * 2 + 1}, $${idx * 2 + 2})`).join(', ');
      const values = teacherIds.flatMap(tid => [id, tid]);
      await db.query(
        `INSERT INTO lab10.schedule_teachers (schedule_id, teacher_id) VALUES ${insertTeachers} ON CONFLICT DO NOTHING`,
        values
      );
    }

    return rows[0];
  }

  async deleteSchedule(db, id) {
    const query = 'DELETE FROM lab10.schedule WHERE id = $1 RETURNING id';
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }

  async createDepartment(db, name) {
    const { rows } = await db.query(
      'INSERT INTO lab10.departments (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
  }

  async createPosition(db, name) {
    const { rows } = await db.query(
      'INSERT INTO lab10.positions (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
  }

  async createTeacher(db, teacherData) {
    const { lastname, firstname, middlename, department_id, position_id } = teacherData;
    const { rows } = await db.query(
      'INSERT INTO lab10.teachers (lastname, firstname, middlename, department_id, position_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [lastname, firstname, middlename, department_id, position_id]
    );
    return rows[0];
  }

  async createBuilding(db, name) {
    const { rows } = await db.query(
      'INSERT INTO lab10.buildings (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
  }

  async createClassroom(db, classroomData) {
    const { number, building_id } = classroomData;
    const { rows } = await db.query(
      'INSERT INTO lab10.classrooms (number, building_id) VALUES ($1, $2) RETURNING *',
      [number, building_id]
    );
    return rows[0];
  }

  async createSubject(db, name) {
    const { rows } = await db.query(
      'INSERT INTO lab10.subjects (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
  }

  async createGroup(db, name) {
    const { rows } = await db.query(
      'INSERT INTO lab10.groups (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
  }

  async createLessonType(db, name) {
    const { rows } = await db.query(
      'INSERT INTO lab10.lesson_types (name) VALUES ($1) RETURNING *',
      [name]
    );
    return rows[0];
  }

  // UPDATE методы
  async updateDepartment(db, id, name) {
    const { rows } = await db.query(
      'UPDATE lab10.departments SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    return rows[0] || null;
  }

  async updatePosition(db, id, name) {
    const { rows } = await db.query(
      'UPDATE lab10.positions SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    return rows[0] || null;
  }

  async updateTeacher(db, id, teacherData) {
    const { lastname, firstname, middlename, department_id, position_id } = teacherData;
    const { rows } = await db.query(
      'UPDATE lab10.teachers SET lastname = $1, firstname = $2, middlename = $3, department_id = $4, position_id = $5 WHERE id = $6 RETURNING *',
      [lastname, firstname, middlename, department_id, position_id, id]
    );
    return rows[0] || null;
  }

  async updateBuilding(db, id, name) {
    const { rows } = await db.query(
      'UPDATE lab10.buildings SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    return rows[0] || null;
  }

  async updateClassroom(db, id, classroomData) {
    const { number, building_id } = classroomData;
    const { rows } = await db.query(
      'UPDATE lab10.classrooms SET number = $1, building_id = $2 WHERE id = $3 RETURNING *',
      [number, building_id, id]
    );
    return rows[0] || null;
  }

  async updateSubject(db, id, name) {
    const { rows } = await db.query(
      'UPDATE lab10.subjects SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    return rows[0] || null;
  }

  async updateGroup(db, id, name) {
    const { rows } = await db.query(
      'UPDATE lab10.groups SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    return rows[0] || null;
  }

  async updateLessonType(db, id, name) {
    const { rows } = await db.query(
      'UPDATE lab10.lesson_types SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    return rows[0] || null;
  }

  // DELETE методы
  async deleteDepartment(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.departments WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deletePosition(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.positions WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deleteTeacher(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.teachers WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deleteBuilding(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.buildings WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deleteClassroom(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.classrooms WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deleteSubject(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.subjects WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deleteGroup(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.groups WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }

  async deleteLessonType(db, id) {
    const { rows } = await db.query('DELETE FROM lab10.lesson_types WHERE id = $1 RETURNING id', [id]);
    return rows[0] || null;
  }
}

export default new ScheduleService();

