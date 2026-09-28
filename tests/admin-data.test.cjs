const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../app/admin-data.js');

function student(overrides = {}) {
  return { id: '20201', name: '학생', number: 1, points: 2,
    monthly: [{ month: '9월', points: 2, detail: '9/1 화, 9/2 수' }],
    role: '역할 없음', rolePoints: 0, extraPoints: 0, history: [], ...overrides };
}

test('CSV 안의 줄바꿈, 쉼표, 이중 따옴표를 보존한다', () => {
  assert.deepEqual(api.parseCsv('"구분","내용"\r\n"기록","첫 줄, 내용\n둘째 ""줄"""'),
    [['구분', '내용'], ['기록', '첫 줄, 내용\n둘째 "줄"']]);
});

test('기준일 당일을 포함하고 이후 기록은 제외한다', () => {
  assert.equal(api.calculate(student(), '2026-08-31', 2026).total, 0);
  assert.equal(api.calculate(student(), '2026-09-01', 2026).total, 1);
  assert.equal(api.calculate(student(), '2026-09-02', 2026).total, 2);
});

test('1월은 학년도 다음 해이며 잘못된 날짜는 제외한다', () => {
  assert.equal(api.dateKey('1/5 월', 2026), '2027-01-05');
  assert.equal(api.dateKey('2026-02-29', 2026), null);
  assert.equal(api.dateKey('2026. 09. 28', 2026), '2026-09-28');
  const entry = student({ monthly: [{ points: 2, detail: '12/31 목, 1/5 화' }] });
  assert.equal(api.calculate(entry, '2026-12-31', 2026).total, 1);
  assert.equal(api.calculate(entry, '2027-01-05', 2026).total, 2);
});

test('5회당 상점은 기준일 이전에 채운 횟수로 계산한다', () => {
  const entry = student({ role: '핸드폰 담당 1', rolePoints: 3, points: 5, roleLoaded: true,
    roleDates: ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-07'] });
  assert.equal(api.calculate(entry, '2026-09-04', 2026).roleScore, 0);
  assert.equal(api.calculate(entry, '2026-09-07', 2026).roleScore, 3);
  assert.deepEqual(api.calculate(entry, '2026-09-07', 2026).issues, []);
});

test('날짜별 추가 상점과 역할 상점을 합산한다', () => {
  const entry = student({ role: '분리수거', rolePoints: 6, points: 13, roleLoaded: true,
    roleDates: ['2026-09-01', '2026-09-03'], extraPoints: 5,
    history: [{ date: '2026-09-02', points: 2 }, { date: '2026-09-04', points: 3 }] });
  const result = api.calculate(entry, '2026-09-02', 2026);
  assert.equal(result.total, 7);
  assert.deepEqual(result.issues, []);
});

test('공동 순위 1, 1, 3을 사용하고 동점은 번호순으로 표시한다', () => {
  const list = [student({ number: 3, points: 1, monthly: [{ points: 1, detail: '9/1' }] }),
    student({ number: 2 }), student({ number: 1 })];
  const ranked = api.rankStudents(list, '2026-09-02', 2026);
  assert.deepEqual(ranked.map(item => item.number), [1, 2, 3]);
  assert.deepEqual(ranked.map(item => item.rank), [1, 1, 3]);
});

test('날짜를 확인할 수 없는 점수는 순위에서 제외한다', () => {
  const ranked = api.rankStudents([student({ points: 5, extraPoints: 3 }), student()], '2026-09-02', 2026);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, null);
  assert.ok(ranked[1].issues.includes('추가 상점 날짜 확인 필요'));
  assert.ok(api.calculate(student({ role: '분리수거', points: 5, rolePoints: 3 }), '2026-09-02', 2026).issues.length);
});

test('학생 시트와 역할 시트를 실제 형식대로 읽는다', () => {
  const rows = api.parseCsv('"학생 상점 내역","","",""\n"학번","20201","총 상점","6점"\n"9월 출석","2","9/1 화, 9/2 수",""\n"1인1역","3","분리수거 1",""\n"추가 상점","1","월별 기록 시트",""\n"날짜","","상점",""\n"2026-09-02","친절","1",""');
  let entry = api.parseStudentSheet(student(), rows, 2026);
  entry = api.attachRoleDates(entry, [['날짜', '학생'], ['2026-09-02', 'TRUE'], ['2026-09-03', 'FALSE']], 2026);
  assert.equal(api.calculate(entry, '2026-09-01', 2026).total, 1);
  assert.equal(api.calculate(entry, '2026-09-02', 2026).total, 6);
  assert.deepEqual(api.calculate(entry, '2026-09-02', 2026).issues, []);
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
  const ranked = api.rankStudents(result, `${config.academicYear + 1}-02-28`, config.academicYear);
  for (const entry of ranked) {
    assert.deepEqual(entry.issues, [], `${entry.id}의 기록이 완전해야 합니다.`);
    const main = mainRows.find(row => row[0] === entry.id);
    assert.equal(entry.total, api.pointsNumber(main[2]), `${entry.id} 총 상점`);
  }
  console.log(`실제 시트 ${ranked.length}명 검증 완료 · 총 ${ranked.reduce((sum, item) => sum + item.total, 0)}점`);
});
