import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', '..', '..', 'data', 'lab8', 'task2');
const cupFilePath = path.join(dataDir, 'cup.txt');
const groupsFilePath = path.join(dataDir, 'groups.json');
const stadiumsFilePath = path.join(dataDir, 'stadium.json');

class Task2Service {
  async readCupFile() {
    try {
      const data = await fs.readFile(cupFilePath, 'utf8');
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Файл cup.txt не найден. Загрузите его в папку data/lab8/task2/');
      }
      throw error;
    }
  }

  async parseCupData() {
    const content = await this.readCupFile();
    const lines = content.split('\n').filter(line => line.trim());
    const groups = {};
    const stadiums = {};
    let currentGroup = null;
    const monthMap = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.match(/^Group\s+[A-H]/i)) {
        const match = trimmed.match(/Group\s+([A-H])/i);
        if (match) {
          currentGroup = match[1].toUpperCase();
          groups[currentGroup] = { group: currentGroup, matches: [] };
        }
      } else if (trimmed.match(/^\(\d+\)/) && currentGroup) {
        const rest = trimmed.replace(/^\(\d+\)\s*/, '');
        const dateTimeMatch = rest.match(/^(\w+\s+\w+\/\d+)\s+(\d{2}:\d{2})/);
        if (!dateTimeMatch) continue;

        const dateStr = dateTimeMatch[1];
        const time = dateTimeMatch[2];
        const afterDateTime = rest.substring(dateTimeMatch[0].length).trim();
        const scoreMatch = afterDateTime.match(/(\d+)\s*-\s*(\d+)/);
        if (!scoreMatch) continue;

        const team1 = afterDateTime.substring(0, scoreMatch.index).trim().replace(/\s+/g, ' ');
        let afterScore = afterDateTime.substring(scoreMatch.index + scoreMatch[0].length).trim();
        const stadiumMatch = afterScore.match(/@\s+(.+)$/);

        const team2 = stadiumMatch
          ? afterScore.substring(0, stadiumMatch.index).trim().replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ')
          : afterScore.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ');
        const stadium = stadiumMatch ? stadiumMatch[1].trim() : 'Unknown';

        if (!team1 || !team2) continue;

        const dateMatch = dateStr.match(/(\w+)\s+(\w+)\/(\d+)/);
        const date = dateMatch
          ? `2022-${monthMap[dateMatch[2]] || '11'}-${dateMatch[3].padStart(2, '0')}`
          : dateStr;

        const match = {
          date, time,
          team1: team1.trim(),
          team2: team2.trim(),
          score1: parseInt(scoreMatch[1]),
          score2: parseInt(scoreMatch[2]),
          stadium: stadium.trim()
        };

        groups[currentGroup].matches.push(match);

        if (!stadiums[stadium]) {
          stadiums[stadium] = { stadium, matches: [] };
        }
        stadiums[stadium].matches.push({ ...match, group: currentGroup });
      }
    }

    if (Object.keys(groups).length === 0) {
      throw new Error('Не удалось найти данные о группах. Проверьте формат файла cup.txt');
    }

    return { groups, stadiums };
  }

  async processAndSave() {
    const { groups, stadiums } = await this.parseCupData();
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(groupsFilePath, JSON.stringify(groups, null, 2), 'utf8');
    await fs.writeFile(stadiumsFilePath, JSON.stringify(stadiums, null, 2), 'utf8');
    return { groups, stadiums };
  }

  async getGroups() {
    try {
      return JSON.parse(await fs.readFile(groupsFilePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return (await this.processAndSave()).groups;
      }
      throw error;
    }
  }

  async getStadiums() {
    try {
      return JSON.parse(await fs.readFile(stadiumsFilePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        return (await this.processAndSave()).stadiums;
      }
      throw error;
    }
  }
}

export default new Task2Service();

