import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataFilePath = path.join(__dirname, '..', '..', '..', 'data', 'lab8', 'task1.txt');

class Task1Service {
  async readUsers() {
    try {
      const data = await fs.readFile(dataFilePath, 'utf8');
      return data.trim()
        ? data.split('\n').filter(line => line.trim()).map(line => JSON.parse(line))
        : [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
        return [];
      }
      throw error;
    }
  }

  async writeUser(user) {
    await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
    await fs.appendFile(dataFilePath, JSON.stringify(user) + '\n', 'utf8');
    //await fs.writeFile(dataFilePath, JSON.stringify(user), 'utf-8');
  }

  async getAll() {
    return await this.readUsers();
  }

  async create(userData) {
    const users = await this.readUsers();
    const nextId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      ...userData
    };
    await this.writeUser(newUser);
    return newUser;
  }

  makeInitials(lastname, firstname, surname) {
    return {
      lastname,
      firstnameLetter: firstname.charAt(0).toUpperCase(),
      surnameLetter: surname.charAt(0).toUpperCase(),
    };
  }

  makeProjectStatus(lastname, firstname, surname, isParticipant) {
    return {
      ...this.makeInitials(lastname, firstname, surname),
      projectParticipant: isParticipant ? "Участвует" : "Не участвует",
    };
  }
}

export default new Task1Service();

