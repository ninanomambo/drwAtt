import { openDB, saveAttendance, getAttendance, getAllAttendances, deleteOldRecords } from '/drwAtt/db.js';
import { initGoogleSync } from '/drwAtt/google.js';

let dbInstance;
const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const $ = (selector) => document.querySelector(selector);
const showToast = (msg) => {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => (toast.style.display = 'none'), 2000);
};

const vibrate = () => navigator.vibrate?.(100);

function getKoreanTimeStr(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() / 60;
  const koreaTime = new Date(date.getTime() + (9 + tzOffset) * 3600 * 1000);
  return `${String(koreaTime.getMonth() + 1).padStart(2, '0')}월-${String(koreaTime.getDate()).padStart(2, '0')}일 ${String(koreaTime.getHours()).padStart(2, '0')}:${String(koreaTime.getMinutes()).padStart(2, '0')}`;
}

function getDateKey(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() / 60;
  const koreaTime = new Date(date.getTime() + (9 + tzOffset) * 3600 * 1000);
  return koreaTime.toISOString().split('T')[0];
}

async function initApp() {
  dbInstance = await openDB();
  $('#clock-in-btn').addEventListener('click', async () => {
    const dateKey = getDateKey();
    const existing = await getAttendance(dateKey);
    if (!existing?.clockIn) {
      const now = getKoreanTimeStr();
      await saveAttendance(dateKey, { ...existing, clockIn: now });
      showToast('출근 기록됨');
      vibrate();
    } else {
      showToast('이미 출근 기록 있음');
    }
  });

  $('#clock-out-btn').addEventListener('click', async () => {
    const dateKey = getDateKey();
    const existing = await getAttendance(dateKey);
    const now = getKoreanTimeStr();
    await saveAttendance(dateKey, { ...existing, clockOut: now });
    showToast('퇴근 기록됨');
    vibrate();
  });

  $('#view-log-btn').addEventListener('click', () => showAttendanceLayer());
  $('#google-sync-btn').addEventListener('click', () => initGoogleSync());
  $('#google-backup-btn').addEventListener('click', () => {
    showToast('Google 연동이 필요합니다');
  });
  $('#google-restore-btn').addEventListener('click', () => {
    showToast('Google 연동이 필요합니다');
  });
}

function parseTime(str) {
  const [_, mm, dd, hh, mi] = str.match(/(\d+)월-(\d+)일 (\d+):(\d+)/) || [];
  return new Date(`2024-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh}:${mi}:00+09:00`);
}

function calculateWorkTime(clockInStr, clockOutStr) {
  if (!clockInStr || !clockOutStr) return '';
  let start = parseTime(clockInStr);
  let end = parseTime(clockOutStr);
  let duration = (end - start) / (1000 * 60 * 60);

  if (start < new Date(start.setHours(12, 0)) && end > new Date(end.setHours(11, 30))) {
    duration -= 0.5; // 점심시간 제외
  }
  if (duration > 11) duration -= 1; // 저녁시간 제외
  return `${Math.floor(duration)}시간`;
}

async function showAttendanceLayer() {
  const data = await getAllAttendances();
  const now = new Date();
  const today = getDateKey(now);
  const thisWeek = [], lastWeek = [];

  let currentWeekDates = [], lastWeekDates = [];
  let monday = new Date(now.setDate(now.getDate() - (now.getDay() + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    currentWeekDates.push(getDateKey(date));
  }

  for (let i = -7; i < 0; i++) {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    lastWeekDates.push(getDateKey(date));
  }

  await deleteOldRecords(currentWeekDates, lastWeekDates);

  const makeTable = (weekDates, label) => {
    let rows = '';
    let totalHours = 0;
    weekDates.forEach(date => {
      const record = data.find(d => d.date === date);
      const d = new Date(date);
      const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}일`;
      const weekday = weekdayNames[d.getDay()];
      const inTime = record?.clockIn || '';
      const outTime = record?.clockOut || '';
      const workTime = calculateWorkTime(inTime, outTime);
      if (d.getDay() >= 1 && d.getDay() <= 5 && workTime) {
        totalHours += parseInt(workTime);
      }
      rows += `<tr><td>${mmdd}</td><td>${weekday}</td><td><input value="${inTime}" /></td><td><input value="${outTime}" /></td><td>${workTime}</td></tr>`;
    });
    return `<h3>■ ${label}</h3><table><thead><tr><th>날짜</th><th>요일</th><th>출근</th><th>퇴근</th><th>근무시간</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="5">주중근무시간(월~금): ${totalHours}시간</td></tr></tfoot></table>`;
  };

  const html = makeTable(currentWeekDates, '이번주') + makeTable(lastWeekDates, '지난주');

  const layer = document.createElement('div');
  layer.className = 'overlay';
  layer.innerHTML = `<div class="overlay-content"><button class="close-btn">×</button>${html}</div>`;
  document.body.appendChild(layer);
  layer.querySelector('.close-btn').addEventListener('click', () => document.body.removeChild(layer));
}

document.addEventListener('DOMContentLoaded', initApp);
