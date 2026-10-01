const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../app/admin-data.js');

function student(overrides = {}) {
  return { id: '20201', name: '학생', number: 1, points: 2,
    monthly: [{ month: '9월', points: 2, detail: '9/1 화, 9/2 수' }],
    role: '역할 없음', rolePoints: 0, extraPoints: 0, history: [], ...overrides };
}

for (const [name, role] of [['조은찬', '칠판정리'], ['이동하', '학생 관리']]) {
  test(`${name}의 ${role}는 누적 5일마다 3점이며 조회 기간 이전 수행일도 누적한다`, () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`);
    const entry = api.attachRoleDates(student({ name, role, rolePoints: 6, points: 8 }),
      [['날짜', name], ...dates.map(date => [date, 'TRUE']), [dates[0], 'TRUE'], ['2026-10-11', 'FALSE']], 2026);
    assert.equal(entry.roleDates.length, 10);
    for (const [end, expected] of [['04', 0], ['05', 3], ['09', 3], ['10', 6]]) {
      const result = api.calculate(entry, '2026-10-01', `2026-10-${end}`, 2026);
      assert.equal(result.roleScore, expected);
      assert.deepEqual(result.issues, []);
    }
    assert.equal(api.calculate(entry, '2026-10-05', '2026-10-05', 2026).roleScore, 3);
    assert.equal(api.calculate(entry, '2026-10-06', '2026-10-09', 2026).roleScore, 0);
    assert.equal(api.calculate(entry, '2026-10-06', '2026-10-10', 2026).roleScore, 3);
  });
}

test('CSV 안의 줄바꿈, 쉼표, 이중 따옴표를 보존한다', () => {
  assert.deepEqual(api.parseCsv('"구분","내용"\r\n"기록","첫 줄, 내용\n둘째 ""줄"""'),
    [['구분', '내용'], ['기록', '첫 줄, 내용\n둘째 "줄"']]);
});

test('시작일부터 오늘까지 양 끝을 포함하고 기간 밖 기록은 제외한다', () => {
  const entry = student({ points: 4, monthly: [{ month: '9월', points: 4, detail: '9/1, 9/2, 9/3, 9/4' }] });
  assert.equal(api.calculate(entry, '2026-09-02', '2026-09-03', 2026).total, 2);
  assert.equal(api.calculate(entry, '2026-09-03', '2026-09-03', 2026).total, 1);
  assert.throws(() => api.calculate(entry, '2026-09-04', '2026-09-03', 2026), RangeError);
});

test('역할 상점은 기간 안에 5회째가 된 날 받은 점수를 포함한다', () => {
  const entry = student({ role: '핸드폰 담당', rolePoints: 6, points: 8, roleLoaded: true,
    roleDates: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-07',
      '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-14'] });
  assert.equal(api.calculate(entry, '2026-09-07', '2026-09-07', 2026).roleScore, 3);
  assert.equal(api.calculate(entry, '2026-09-08', '2026-09-11', 2026).roleScore, 0);
  assert.equal(api.calculate(entry, '2026-09-08', '2026-09-14', 2026).roleScore, 3);
});

test('학생 내역과 추가 상점은 시작일 이전 날짜를 표시하지 않는다', () => {
  const entry = student({ points: 8, extraPoints: 6,
    history: [{ date: '2026-09-01', points: 1, detail: '이전 기록' },
      { date: '2026-09-02', points: 2, detail: '기간 내 기록' }, { date: '2026-09-03', points: 3, detail: '이후 기록' }] });
  const result = api.calculate(entry, '2026-09-02', '2026-09-02', 2026);
  assert.equal(result.total, 3);
  assert.deepEqual(result.issues, []);
  const records = api.periodRecords(entry, '2026-09-02', '2026-09-02', 2026);
  assert.equal(records.reduce((sum, record) => sum + record.points, 0), 3);
  assert.ok(!JSON.stringify(records).includes('2026-09-01'));
  assert.ok(!JSON.stringify(records).includes('이전 기록'));
  assert.ok(!JSON.stringify(records).includes('이후 기록'));
});

test('순위는 누적 총점이 아닌 선택 기간의 점수로 정한다', () => {
  const a = student({ number: 1, points: 3, monthly: [{ points: 3, detail: '9/1, 9/2, 9/3' }] });
  const b = student({ number: 2, points: 2, monthly: [{ points: 2, detail: '9/3, 9/4' }] });
  const ranked = api.rankStudents([a, b], '2026-09-03', '2026-09-04', 2026);
  assert.deepEqual(ranked.map(entry => entry.number), [2, 1]);
  assert.deepEqual(ranked.map(entry => entry.total), [2, 1]);
});

test('기간 종료일 당일을 포함하고 이후 기록은 제외한다', () => {
  assert.equal(api.calculate(student(), '2026-03-01', '2026-08-31', 2026).total, 0);
  assert.equal(api.calculate(student(), '2026-03-01', '2026-09-01', 2026).total, 1);
  assert.equal(api.calculate(student(), '2026-03-01', '2026-09-02', 2026).total, 2);
});

test('1월은 학년도 다음 해이며 잘못된 날짜는 제외한다', () => {
  assert.equal(api.dateKey('1/5 월', 2026), '2027-01-05');
  assert.equal(api.dateKey('2026-02-29', 2026), null);
  assert.equal(api.dateKey('2026. 09. 28', 2026), '2026-09-28');
  const entry = student({ monthly: [{ points: 2, detail: '12/31 목, 1/5 화' }] });
  assert.equal(api.calculate(entry, '2026-03-01', '2026-12-31', 2026).total, 1);
  assert.equal(api.calculate(entry, '2026-03-01', '2027-01-05', 2026).total, 2);
});

test('5회당 상점은 종료일까지 채운 횟수로 계산한다', () => {
  const entry = student({ role: '핸드폰 담당 1', rolePoints: 3, points: 5, roleLoaded: true,
    roleDates: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-07'] });
  assert.equal(api.calculate(entry, '2026-03-01', '2026-09-04', 2026).roleScore, 0);
  assert.equal(api.calculate(entry, '2026-03-01', '2026-09-07', 2026).roleScore, 3);
  assert.deepEqual(api.calculate(entry, '2026-03-01', '2026-09-07', 2026).issues, []);
});

test('날짜별 추가 상점과 역할 상점을 합산한다', () => {
  const entry = student({ role: '분리수거', rolePoints: 6, points: 13, roleLoaded: true,
    roleDates: ['2026-09-01', '2026-09-03'], extraPoints: 5,
    history: [{ date: '2026-09-02', points: 2 }, { date: '2026-09-04', points: 3 }] });
  const result = api.calculate(entry, '2026-03-01', '2026-09-02', 2026);
  assert.equal(result.total, 7);
  assert.deepEqual(result.issues, []);
});

test('공동 순위 1, 1, 3을 사용하고 동점은 번호순으로 표시한다', () => {
  const list = [student({ number: 3, points: 1, monthly: [{ points: 1, detail: '9/1' }] }),
    student({ number: 2 }), student({ number: 1 })];
  const ranked = api.rankStudents(list, '2026-03-01', '2026-09-02', 2026);
  assert.deepEqual(ranked.map(item => item.number), [1, 2, 3]);
  assert.deepEqual(ranked.map(item => item.rank), [1, 1, 3]);
});

test('날짜를 확인할 수 없는 점수는 순위에서 제외한다', () => {
  const ranked = api.rankStudents([student({ points: 5, extraPoints: 3 }), student()], '2026-03-01', '2026-09-02', 2026);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, null);
  assert.ok(ranked[1].issues.includes('추가 상점 날짜 확인 필요'));
  assert.ok(api.calculate(student({ role: '분리수거', points: 5, rolePoints: 3 }), '2026-03-01', '2026-09-02', 2026).issues.length);
});

test('학생 시트와 역할 시트를 실제 형식대로 읽는다', () => {
  const rows = api.parseCsv('"학생 상점 내역","","",""\n"학번","20201","총 상점","6점"\n"9월 출석","2","9/1 화, 9/2 수",""\n"1인1역","3","분리수거 1",""\n"추가 상점","1","월별 기록 시트",""\n"날짜","","상점",""\n"2026-09-02","친절","1",""');
  let entry = api.parseStudentSheet(student(), rows, 2026);
  entry = api.attachRoleDates(entry, [['날짜', '학생'], ['2026-09-02', 'TRUE'], ['2026-09-03', 'FALSE']], 2026);
  assert.equal(api.calculate(entry, '2026-03-01', '2026-09-01', 2026).total, 1);
  assert.equal(api.calculate(entry, '2026-03-01', '2026-09-02', 2026).total, 6);
  assert.deepEqual(api.calculate(entry, '2026-03-01', '2026-09-02', 2026).issues, []);
});

test('실제 구글 시트의 전체 기록 합계가 메인 총 상점과 일치한다', { skip: !process.env.CHECK_LIVE_SHEETS }, async () => {
  const fs = require('node:fs');
  const vm = require('node:vm');
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('../app/data.js'), 'utf8') + '\nthis.roster = DEFAULT_STUDENTS; this.config = GOOGLE_SHEET_CONFIG;', context);
  const { roster, config } = context;
  async function fetchRows(gid) {
    const response = await fetch(`${config.baseUrl}&gid=${gid}`, { signal: AbortSignal.timeout(15000) });
    assert.ok(response.ok);
    return api.parseCsv(await response.text());
  }
  const mainRows = await fetchRows(config.mainGid);
  const roleRows = new Map(await Promise.all(Object.entries(api.ROLE_RULES).map(async ([name, rule]) => [name, await fetchRows(rule.gid)])));
  const result = [];
  for (let i = 0; i < roster.length; i += 5) {
    result.push(...await Promise.all(roster.slice(i, i + 5).map(async original => {
      let entry = api.parseStudentSheet(original, await fetchRows(original.gid), config.academicYear);
      const roleName = Object.keys(api.ROLE_RULES).find(name => entry.role.startsWith(name));
      if (roleName) entry = api.attachRoleDates(entry, roleRows.get(roleName), config.academicYear);
      return entry;
    })));
  }
  const ranked = api.rankStudents(result, '2026-03-01', `${config.academicYear + 1}-02-28`, config.academicYear);
  for (const entry of ranked) {
    assert.deepEqual(entry.issues, [], `${entry.id}의 기록이 완전해야 합니다.`);
    const main = mainRows.find(row => row[0] === entry.id);
    assert.equal(entry.total, api.pointsNumber(main[2]), `${entry.id} 총 상점`);
  }
  console.log(`실제 시트 ${ranked.length}명 검증 완료 · 총 ${ranked.reduce((sum, item) => sum + item.total, 0)}점`);
});
