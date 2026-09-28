/* 날짜별 상점 계산. 브라우저와 Node 검증에서 같은 계산 함수를 사용합니다. */
(function (root) {
  'use strict';
  const ROLE_RULES = {
    '핸드폰 담당': { gid: '1616173869', every: 5, points: 3 },
    '출석부 담당': { gid: '1791574817', every: 5, points: 1 },
    '분리수거': { gid: '408675367', every: 1, points: 3 },
    '테블릿 관리': { gid: '2066046088', every: 5, points: 3 },
    '특별실 청소': { gid: '1613811606', every: 1, points: 1 }
  };

  function parseCsv(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (char === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim());
        if (row.some(Boolean)) rows.push(row);
        row = []; cell = '';
      } else cell += char;
    }
    row.push(cell.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function dateKey(value, academicYear) {
    const text = String(value || '').trim();
    const full = text.match(/^(\d{4})\s*[-/.년]\s*(\d{1,2})\s*[-/.월]\s*(\d{1,2})/);
    const short = !full && text.match(/^(\d{1,2})\s*[/월.-]\s*(\d{1,2})/);
    if (!full && !short) return null;
    const month = Number(full ? full[2] : short[1]);
    const day = Number(full ? full[3] : short[2]);
    const year = full ? Number(full[1]) : Number(academicYear) + (month < 3 ? 1 : 0);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function datesFromDetail(detail, year) {
    const matches = String(detail || '').match(/(?:\d{4}\s*[-/.년]\s*)?\d{1,2}\s*[/월.-]\s*\d{1,2}/g) || [];
    return [...new Set(matches.map(value => dateKey(value, year)).filter(Boolean))];
  }

  function pointsNumber(value) {
    const match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function parseStudentSheet(student, rows, year) {
    const result = { ...student, monthly: [], history: [], rolePoints: 0, extraPoints: 0 };
    let foundAttendance = false, inHistory = false;
    for (const row of rows) {
      const first = row[0] || '', second = row[1] || '', third = row[2] || '';
      const totalCol = row.findIndex(cell => cell.includes('총 상점'));
      if (totalCol >= 0 && row[totalCol + 1]) result.points = pointsNumber(row[totalCol + 1]);
      if (/\d+월\s*출석/.test(first)) {
        foundAttendance = true;
        result.monthly.push({ month: first.split(' ')[0], points: pointsNumber(second), detail: third });
      } else if (/1인\s*1역/.test(first)) {
        result.rolePoints = pointsNumber(second);
        result.role = third || result.role;
      } else if (first.includes('추가 상점')) result.extraPoints = pointsNumber(second);
      else if (first === '날짜' && row.some(cell => cell === '상점')) {
        inHistory = true;
        result.historyPointsCol = row.indexOf('상점');
      } else if (inHistory && dateKey(first, year)) {
        result.history.push({ date: first, points: pointsNumber(row[result.historyPointsCol]), detail: second });
      }
    }
    if (!foundAttendance) throw new Error('학생별 출석 기록 형식을 확인할 수 없습니다.');
    return result;
  }

  function attachRoleDates(student, rows, year) {
    const col = (rows[0] || []).findIndex(cell => cell === student.name);
    if (col < 1) throw new Error('역할 시트에서 학생을 찾을 수 없습니다.');
    const raw = rows.slice(1).filter(row => String(row[col]).toUpperCase() === 'TRUE');
    const dates = raw.map(row => dateKey(row[0], year));
    if (dates.some(date => !date)) throw new Error('역할 수행일을 확인할 수 없습니다.');
    return { ...student, roleDates: [...new Set(dates)], roleLoaded: true };
  }

  function calculate(student, start, end, year) {
    if (!dateKey(start, year) || !dateKey(end, year) || start > end) throw new RangeError('조회 기간을 확인해주세요.');
    let attendance = 0, role = 0, extra = 0;
    const issues = [];
    for (const month of student.monthly || []) {
      const dates = datesFromDetail(month.detail, year);
      if (dates.length !== Number(month.points)) issues.push('출석일 확인 필요');
      attendance += dates.filter(date => date >= start && date <= end).length;
    }
    const rule = Object.entries(ROLE_RULES).find(([name]) => (student.role || '').startsWith(name));
    if (rule && student.roleLoaded) {
      const count = student.roleDates.filter(date => date <= end).length;
      const before = student.roleDates.filter(date => date < start).length;
      role = (Math.floor(count / rule[1].every) - Math.floor(before / rule[1].every)) * rule[1].points;
      const recordedRole = Math.floor(student.roleDates.length / rule[1].every) * rule[1].points;
      if (recordedRole !== Number(student.rolePoints || 0)) issues.push('역할 상점 확인 필요');
    } else if (Number(student.rolePoints) > 0 || rule) issues.push('역할 수행일 확인 필요');
    const history = student.history || [];
    const datedExtra = history.reduce((sum, record) => sum + Number(record.points || 0), 0);
    if (datedExtra !== Number(student.extraPoints || 0)) issues.push('추가 상점 날짜 확인 필요');
    for (const record of history) {
      const date = dateKey(record.date, year);
      if (!date) issues.push('추가 상점 날짜 확인 필요');
      else if (date >= start && date <= end) extra += Number(record.points || 0);
    }
    const recordedTotal = (student.monthly || []).reduce((sum, item) => sum + Number(item.points || 0), 0)
      + Number(student.rolePoints || 0) + Number(student.extraPoints || 0);
    if (recordedTotal !== Number(student.points)) issues.push('총 상점 내역 확인 필요');
    return { ...student, attendance, roleScore: role, extraScore: extra,
      total: attendance + role + extra, issues: [...new Set(issues)] };
  }

  function rankStudents(students, start, end, year) {
    const entries = students.map(student => calculate(student, start, end, year));
    entries.sort((a, b) => Boolean(a.issues.length) - Boolean(b.issues.length) || b.total - a.total || a.number - b.number);
    let previous = null, rank = 0, position = 0;
    return entries.map(entry => {
      if (entry.issues.length) return { ...entry, rank: null };
      position++;
      if (entry.total !== previous) rank = position;
      previous = entry.total;
      return { ...entry, rank };
    });
  }

  function periodRecords(student, start, end, year) {
    const result = calculate(student, start, end, year);
    const records = (student.monthly || []).map(month => {
      const dates = datesFromDetail(month.detail, year).filter(date => date >= start && date <= end);
      return { label: `${month.month} 출석`, points: dates.length, detail: dates.join(', ') };
    }).filter(record => record.points > 0);
    if (result.roleScore > 0) {
      const dates = (student.roleDates || []).filter(date => date >= start && date <= end);
      records.push({ label: '1인1역', points: result.roleScore,
        detail: `${student.role}\n기간 내 수행 ${dates.length}회\n수행 날짜: ${dates.join(', ')}\n기간 내 받은 상점: ${result.roleScore}점` });
    }
    for (const record of student.history || []) {
      const date = dateKey(record.date, year);
      if (date && date >= start && date <= end && Number(record.points) > 0) {
        records.push({ label: `${date} 추가 상점`, points: Number(record.points), detail: record.detail || '' });
      }
    }
    return records;
  }

  const api = { ROLE_RULES, parseCsv, dateKey, datesFromDetail, pointsNumber, parseStudentSheet, attachRoleDates, calculate, rankStudents, periodRecords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AdminPoints = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
