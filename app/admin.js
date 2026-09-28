(function () {
  'use strict';
  const api = AdminPoints;
  const year = GOOGLE_SHEET_CONFIG.academicYear;
  let students = DEFAULT_STUDENTS.map(student => ({ ...student }));
  let syncing = false, hasSynced = false;
  let authenticated = false;
  const login = document.getElementById('adminLogin');
  const dashboard = document.getElementById('adminDashboard');
  const passwordInput = document.getElementById('adminPassword');
  const loginError = document.getElementById('adminLoginError');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const dateInput = document.getElementById('cutoffDate');
  const refreshBtn = document.getElementById('adminRefreshBtn');
  const syncStatus = document.getElementById('adminSyncStatus');
  const rankingBody = document.getElementById('rankingBody');
  const warning = document.getElementById('rankingWarning');

  function today() {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function render() {
    if (!authenticated) return;
    const cutoff = dateInput.value;
    if (!cutoff || !dateInput.checkValidity()) return;
    const ranked = api.rankStudents(students, cutoff, year);
    const verified = ranked.filter(student => !student.issues.length);
    const total = verified.reduce((sum, student) => sum + student.total, 0);
    const incomplete = ranked.length - verified.length;
    document.getElementById('classPoints').textContent = verified.length ? total : '—';
    document.getElementById('studentCount').textContent = ranked.length;
    document.getElementById('averagePoints').textContent = verified.length ? (total / verified.length).toFixed(1) : '—';
    document.getElementById('rankingDate').textContent = `${cutoff.replace(/-/g, '. ')} 기준`;
    warning.hidden = incomplete === 0;
    warning.textContent = `${incomplete}명의 기록을 확인해야 합니다. 해당 학생은 순위·학급 총 상점·평균에서 제외됩니다. 날짜가 확인된 점수는 아래에 표시됩니다.`;
    rankingBody.innerHTML = ranked.map(student => `
      <tr class="${student.rank === 1 ? 'top-ranked' : ''}">
        <td><span class="rank-number${student.rank === 1 ? ' rank-first' : ''}">${student.rank || '—'}</span></td>
        <th scope="row"><span class="ranking-name">${escapeHtml(student.name)}</span><span class="ranking-student-id">${escapeHtml(student.id)} · ${student.number}번</span>${student.issues.length ? `<span class="ranking-issue">${escapeHtml(student.issues.join(' · '))}</span>` : ''}</th>
        <td>${student.attendance}</td><td>${student.roleScore}</td><td>${student.extraScore}</td>
        <td class="ranking-total">${student.total}<span class="ranking-unit">점${student.issues.length ? ' (확인 중)' : ''}</span></td>
      </tr>`).join('');
  }

  async function fetchRows(gid) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${GOOGLE_SHEET_CONFIG.baseUrl}&gid=${gid}&_t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`시트 응답 오류: ${response.status}`);
      const text = await response.text();
      if (/^\s*</.test(text)) throw new Error('시트를 CSV로 불러올 수 없습니다.');
      return api.parseCsv(text);
    } finally { clearTimeout(timeout); }
  }

  async function sync() {
    if (!authenticated || syncing) return;
    syncing = true;
    refreshBtn.disabled = true;
    refreshBtn.classList.add('spinning');
    document.querySelector('.admin-ranking').setAttribute('aria-busy', 'true');
    syncStatus.textContent = '구글 시트 기록을 불러오는 중입니다.';
    try {
      // 역할 시트는 한 번씩만 읽고 학생별 시트는 최대 5개씩 불러옵니다.
      const roleEntries = Object.entries(api.ROLE_RULES);
      const roleResults = await Promise.allSettled(roleEntries.map(([, rule]) => fetchRows(rule.gid)));
      const roleRows = new Map(roleEntries.map(([name], index) => [name, roleResults[index]]));
      const updated = new Array(students.length);
      let next = 0, failed = 0, loaded = 0;
      async function worker() {
        while (next < students.length) {
          const index = next++;
          const original = students[index];
          try {
            let student = api.parseStudentSheet(original, await fetchRows(original.gid), year);
            student.roleLoaded = false;
            const roleName = roleEntries.find(([name]) => (student.role || '').startsWith(name))?.[0];
            if (roleName) {
              const result = roleRows.get(roleName);
              if (result.status === 'fulfilled') {
                try { student = api.attachRoleDates(student, result.value, year); }
                catch (error) { failed++; console.warn(error); }
              } else failed++;
            }
            updated[index] = student;
          } catch (error) {
            updated[index] = original;
            failed++;
            console.warn('학생 상점 동기화 실패:', original.id, error);
          }
          loaded++;
          syncStatus.textContent = `구글 시트 기록을 불러오는 중 · ${loaded}/${students.length}명`;
        }
      }
      await Promise.all(Array.from({ length: Math.min(5, students.length) }, worker));
      students = updated;
      hasSynced = true;
      render();
      const time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
      syncStatus.textContent = failed
        ? `일부 기록을 불러오지 못했습니다. 저장된 기록을 포함해 표시합니다. 새로고침으로 다시 시도해주세요. (${time})`
        : `구글 시트 동기화됨 · ${time}`;
      syncStatus.classList.toggle('sync-warning', failed > 0);
    } catch (error) {
      syncStatus.textContent = '구글 시트를 불러오지 못해 저장된 기록을 표시합니다. 새로고침으로 다시 시도해주세요.';
      syncStatus.classList.add('sync-warning');
      console.warn(error);
    } finally {
      syncing = false;
      refreshBtn.disabled = false;
      refreshBtn.classList.remove('spinning');
      document.querySelector('.admin-ranking').setAttribute('aria-busy', 'false');
    }
  }

  document.getElementById('dateForm').addEventListener('submit', event => {
    event.preventDefault(); render();
  });
  dateInput.addEventListener('change', render);
  document.getElementById('todayBtn').addEventListener('click', () => { dateInput.value = today(); render(); });
  refreshBtn.addEventListener('click', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && hasSynced) sync(); });
  document.getElementById('adminLoginForm').addEventListener('submit', event => {
    event.preventDefault();
    if (authenticated) return;
    if (passwordInput.value !== '2726') {
      loginError.textContent = '비밀번호가 일치하지 않습니다.';
      loginError.hidden = false;
      passwordInput.setAttribute('aria-invalid', 'true');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }
    authenticated = true;
    passwordInput.value = '';
    loginError.hidden = true;
    passwordInput.removeAttribute('aria-invalid');
    login.hidden = true;
    dashboard.hidden = false;
    refreshBtn.hidden = false;
    logoutBtn.hidden = false;
    dateInput.value = today();
    dateInput.max = today();
    render();
    sync();
    setInterval(() => { if (!document.hidden) sync(); }, 60000);
    dateInput.focus();
  });
  passwordInput.addEventListener('input', () => {
    loginError.hidden = true;
    passwordInput.removeAttribute('aria-invalid');
  });
  // 인증 상태를 저장하지 않아 새로고침이나 재접속 시 다시 비밀번호를 입력합니다.
  logoutBtn.addEventListener('click', () => { window.location.reload(); });
})();
