// 전례력 계산 (한국 천주교 기준, 주요 대축일·축일과 시기·주간·전례색)
// 매일미사 본문은 저작권이 있어 싣지 않고, 굿뉴스 매일미사로 연결한다.

const DAY = 864e5;
const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

const ymd = (y, m, d) => new Date(y, m - 1, d);
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
const diffDays = (a, b) => Math.round((a - b) / DAY);
const sameDay = (a, b) => diffDays(a, b) === 0;
const sundayOnOrBefore = date => addDays(date, -date.getDay());

// 부활 대축일 (그레고리력, Meeus 공식)
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return ymd(y, month, day);
}

// 대림 제1주일: 성탄 전 넷째 주일
function advent1(y) {
  const christmas = ymd(y, 12, 25);
  return addDays(christmas, -(christmas.getDay() || 7) - 21);
}

// 주님 공현 대축일: 한국은 1월 2~8일 사이의 주일
function epiphany(y) {
  const jan2 = ymd(y, 1, 2);
  return addDays(jan2, (7 - jan2.getDay()) % 7);
}

// 주님 세례 축일: 공현 다음 주일, 공현이 7·8일이면 그다음 월요일
function baptism(y) {
  const ep = epiphany(y);
  return ep.getDate() >= 7 ? addDays(ep, 1) : addDays(ep, 7);
}

// 성가정 축일: 성탄 팔일 축제 내 주일, 없으면 12월 30일
function holyFamily(y) {
  for (let d = 26; d <= 31; d++) if (ymd(y, 12, d).getDay() === 0) return ymd(y, 12, d);
  return ymd(y, 12, 30);
}

// 고정 축일: S = 대축일(연중 주일보다 우선), F = 축일(평일에만, lord 는 주일에도)
const FIXED = {
  '01-01': { name: '천주의 성모 마리아 대축일', color: 'white', rank: 'S' },
  '02-02': { name: '주님 봉헌 축일', color: 'white', rank: 'F', lord: true },
  '03-19': { name: '동정 마리아의 배필 성 요셉 대축일', color: 'white', rank: 'S' },
  '03-25': { name: '주님 탄생 예고 대축일', color: 'white', rank: 'S' },
  '06-24': { name: '성 요한 세례자 탄생 대축일', color: 'white', rank: 'S' },
  '06-29': { name: '성 베드로와 성 바오로 사도 대축일', color: 'red', rank: 'S' },
  '08-06': { name: '주님의 거룩한 변모 축일', color: 'white', rank: 'F', lord: true },
  '08-15': { name: '성모 승천 대축일', color: 'white', rank: 'S' },
  '09-14': { name: '성 십자가 현양 축일', color: 'red', rank: 'F', lord: true },
  '09-20': { name: '성 김대건 안드레아 사제와 성 정하상 바오로와 동료 순교자들 대축일', color: 'red', rank: 'S' },
  '09-21': { name: '성 마태오 사도 복음사가 축일', color: 'red', rank: 'S', note: '본당 주보 축일' },
  '11-01': { name: '모든 성인 대축일', color: 'white', rank: 'S' },
  '11-02': { name: '죽은 모든 이를 기억하는 위령의 날', color: 'violet', rank: 'S' },
  '11-09': { name: '라테라노 대성전 봉헌 축일', color: 'white', rank: 'F', lord: true },
  '12-08': { name: '원죄 없이 잉태되신 복되신 동정 마리아 대축일', color: 'white', rank: 'S', note: '한국 교회의 수호자' },
  '12-25': { name: '주님 성탄 대축일', color: 'white', rank: 'S' },
  '12-26': { name: '성 스테파노 첫 순교자 축일', color: 'red', rank: 'F' },
  '12-27': { name: '성 요한 사도 복음사가 축일', color: 'white', rank: 'F' },
  '12-28': { name: '죄 없는 아기 순교자들 축일', color: 'red', rank: 'F' },
};

export const COLOR_NAMES = { white: '백색', red: '홍색', green: '녹색', violet: '자색' };

// 날짜에 따라 움직이는 대축일·축일
function movable(date) {
  const y = date.getFullYear();
  const E = easter(y);
  const list = [
    [addDays(E, -46), '재의 수요일', 'violet'],
    [addDays(E, -7), '주님 수난 성지 주일', 'red'],
    [addDays(E, -3), '주님 만찬 성목요일', 'white'],
    [addDays(E, -2), '주님 수난 성금요일', 'red'],
    [addDays(E, -1), '성토요일 · 주님 부활 성야', 'white'],
    [E, '주님 부활 대축일', 'white'],
    [addDays(E, 7), '부활 제2주일 (하느님의 자비 주일)', 'white'],
    [addDays(E, 42), '주님 승천 대축일', 'white'],
    [addDays(E, 49), '성령 강림 대축일', 'red'],
    [addDays(E, 56), '지극히 거룩하신 삼위일체 대축일', 'white'],
    [addDays(E, 63), '지극히 거룩한 그리스도의 성체 성혈 대축일', 'white'],
    [addDays(E, 68), '지극히 거룩하신 예수 성심 대축일', 'white'],
    [addDays(advent1(y), -7), '온 누리의 임금이신 우리 주 예수 그리스도왕 대축일', 'white'],
    [epiphany(y), '주님 공현 대축일', 'white'],
    [baptism(y), '주님 세례 축일', 'white'],
    [holyFamily(y), '예수, 마리아, 요셉의 성가정 축일', 'white'],
  ];
  const hit = list.find(([d]) => sameDay(d, date));
  return hit && { name: hit[1], color: hit[2] };
}

// 시기·주간 이름
function seasonal(date) {
  const y = date.getFullYear();
  const dow = date.getDay();
  const wd = WEEKDAYS[dow];
  const sun = sundayOnOrBefore(date);
  const E = easter(y), ash = addDays(E, -46), palm = addDays(E, -7), pent = addDays(E, 49);
  const A = advent1(y), bap = baptism(y);
  const named = (season, n, color) => ({
    season,
    color,
    name: dow === 0 ? `${season} 제${n}주일` : `${season} 제${n}주간 ${wd}`,
  });

  if (date >= ymd(y, 12, 25)) {
    return { season: '성탄', color: 'white', name: `성탄 팔일 축제 제${date.getDate() - 24}일` };
  }
  if (date >= A) return named('대림', diffDays(sun, A) / 7 + 1, 'violet');
  if (date < bap) {
    const ep = epiphany(y);
    if (date.getDate() === 1 && date.getMonth() === 0) return { season: '성탄', color: 'white', name: FIXED['01-01'].name };
    return { season: '성탄', color: 'white', name: `주님 공현 대축일 ${date < ep ? '전' : '후'} ${wd}` };
  }
  if (date < ash) {
    const base = bap.getDay() === 0 ? bap : addDays(bap, -1);
    return named('연중', diffDays(sun, base) / 7 + 1, 'green');
  }
  if (date < palm) {
    if (date < addDays(E, -42)) return { season: '사순', color: 'violet', name: `재의 수요일 후 ${wd}` };
    return named('사순', diffDays(sun, addDays(E, -42)) / 7 + 1, 'violet');
  }
  if (date < E) return { season: '사순', color: 'violet', name: `성주간 ${wd}` };
  if (date <= pent) {
    if (date < addDays(E, 7)) return { season: '부활', color: 'white', name: `부활 팔일 축제 내 ${wd}` };
    return named('부활', diffDays(sun, E) / 7 + 1, 'white');
  }
  return named('연중', 34 - diffDays(addDays(A, -7), sun) / 7, 'green');
}

// 오늘의 전례: { name, color, colorName, season, note }
export function liturgicalDay(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const base = seasonal(d);
  const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fixed = FIXED[key];
  const privileged = ['대림', '사순', '부활'].includes(base.season);
  const isSunday = d.getDay() === 0;

  let day = movable(d);
  if (!day && fixed) {
    const wins = fixed.rank === 'S'
      ? !(isSunday && privileged)
      : !isSunday || fixed.lord;
    if (wins) day = fixed;
  }
  day = day || base;
  return {
    name: day.name,
    color: day.color,
    colorName: COLOR_NAMES[day.color],
    season: base.season,
    note: day.note || '',
  };
}

// 굿뉴스 매일미사 (날짜별)
export function readingsUrl(date = new Date()) {
  const s = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `https://maria.catholic.or.kr/mi_pr/missa/missa.asp?menu=missa&missaday=${s}`;
}
