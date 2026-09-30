// 걷기 이야기 장면의 데이터. 본문은 참조 키로만 가리킨다(설계 원칙 1).
// note는 주인공의 독백(게임 텍스트)이다. 성경 인물의 말을 지어내지 않고, 주인공이 보고 느낀 것만 적는다(원칙 3).
// 배경은 1세기 유대·갈릴리 고증을 따른다(원칙 8).

export type Setting =
  | 'jordan' // 요단강 건너편 광야와 갈대
  | 'village' // 갈릴리 마을: 현무암 집
  | 'temple' // 예루살렘 성전 뜰: 석회암 포석과 주랑
  | 'night' // 밤의 예루살렘 골목
  | 'well' // 수가 근처 야곱의 우물, 그리심 산
  | 'pool' // 베데스다 못과 행각
  | 'lake' // 밤의 갈릴리 바다
  | 'synagogue' // 가버나움 회당 앞
  | 'siloam' // 실로암 못의 계단
  | 'pasture' // 돌담 양 우리
  | 'bethany' // 베다니 마을과 바위 무덤
  | 'road' // 예루살렘으로 들어가는 길, 종려나무
  | 'upper' // 다락방: 낮은 식탁, 기대어 앉는 자리
  | 'vineyard' // 밤의 포도원 길
  | 'garden' // 기드론 건너편 감람나무 동산(밤)
  | 'courtyard' // 대제사장 집 뜰, 숯불
  | 'praetorium' // 총독 관저, 돌을 깐 뜰
  | 'golgotha' // 성 밖 언덕
  | 'tomb' // 동산의 바위 무덤
  | 'room' // 문을 닫은 방
  | 'shore'; // 새벽의 디베랴 바닷가, 숯불

export interface Beat {
  ref: string;
  /** 두루마리를 열기 전 주인공의 독백 */
  note?: string;
  /** 두루마리를 열기 전 주인공의 선택(정답·벌점 없음). 고른 번호가 flags[flag]에 들어간다. */
  choice?: { prompt: string; options: [string, string]; flags: [string, string] };
}

export interface Story {
  id: string;
  ch: number;
  title: string;
  sub: string;
  setting: Setting;
  intro?: string;
  /** 수난 장면: 채도를 낮추고 본문을 빨리 넘기지 못하게 한다(원칙 6). */
  solemn?: boolean;
  beats: Beat[];
}

export const STORIES: Record<string, Story> = {};
const add = (s: Story) => (STORIES[s.id] = s);

// ── 1장 ──
add({
  id: '1b',
  ch: 1,
  title: '요단강 건너편',
  sub: '베다니, 요한이 세례를 주던 곳',
  setting: 'jordan',
  intro: '빛을 본 다음 날, 사람들을 따라 요단강 건너편까지 왔다. 물가에 사람들이 모여 있다.',
  beats: [
    { ref: 'john:1:19-28' },
    { ref: 'john:1:29-34' },
    { ref: 'john:1:35-42', note: '두 사람이 누군가를 따라가는 것이 보인다. 나도 조금 떨어져서 따라갔다.' },
    { ref: 'john:1:43-51' },
  ],
});

// ── 2장 ──
add({
  id: '2a',
  ch: 2,
  title: '가나의 혼인 잔치',
  sub: '갈릴리 가나, 잔치가 열린 집',
  setting: 'village',
  intro: '마을이 떠들썩하다. 혼인 잔치가 며칠째 이어지고 있다. 문 옆에 커다란 돌항아리들이 서 있다.',
  beats: [{ ref: 'john:2:1-5' }, { ref: 'john:2:6-10', note: '하인들이 우물과 항아리 사이를 바쁘게 오간다.' }, { ref: 'john:2:11-12' }],
});
add({
  id: '2b',
  ch: 2,
  title: '성전',
  sub: '예루살렘, 유월절 무렵',
  setting: 'temple',
  intro: '유월절이 가까워 예루살렘이 사람으로 가득하다. 성전 뜰에서 소 울음소리와 동전 소리가 뒤섞인다.',
  beats: [{ ref: 'john:2:13-17' }, { ref: 'john:2:18-22' }, { ref: 'john:2:23-25' }],
});

// ── 3장 ──
add({
  id: '3a',
  ch: 3,
  title: '밤에 찾아온 사람',
  sub: '예루살렘의 밤',
  setting: 'night',
  intro: '밤이 깊었다. 골목에 등잔 불빛이 새어 나온다. 누군가 조용히 어느 집으로 들어간다.',
  beats: [{ ref: 'john:3:1-8' }, { ref: 'john:3:9-15' }, { ref: 'john:3:16-21', note: '바람이 골목을 지나간다. 어디서 와서 어디로 가는지 모르겠다.' }],
});
add({
  id: '3b',
  ch: 3,
  title: '애논',
  sub: '살렘 가까운 물가',
  setting: 'jordan',
  beats: [{ ref: 'john:3:22-30' }, { ref: 'john:3:31-36' }],
});

// ── 4장 ──
add({
  id: '4a',
  ch: 4,
  title: '야곱의 우물',
  sub: '사마리아 수가 근처, 정오',
  setting: 'well',
  intro: '해가 머리 위에 있다. 사마리아 땅을 지나는 길, 오래된 우물 곁에서 잠시 쉬었다.',
  beats: [
    { ref: 'john:4:1-6' },
    { ref: 'john:4:7-15', note: '한낮에 한 여자가 혼자 물을 길으러 왔다.' },
    { ref: 'john:4:16-26' },
    { ref: 'john:4:27-30', note: '여자가 물동이를 두고 마을 쪽으로 달려간다.' },
    { ref: 'john:4:31-38' },
    { ref: 'john:4:39-42', note: '마을 사람들이 줄지어 우물 쪽으로 온다.' },
  ],
});
add({
  id: '4b',
  ch: 4,
  title: '왕의 신하',
  sub: '다시 갈릴리 가나',
  setting: 'village',
  beats: [{ ref: 'john:4:43-45' }, { ref: 'john:4:46-50', note: '먼 길을 온 사람이 애타게 무언가를 구한다.' }, { ref: 'john:4:51-54' }],
});

// ── 5장 ──
add({
  id: '5a',
  ch: 5,
  title: '베데스다',
  sub: '예루살렘 양문 곁의 못',
  setting: 'pool',
  intro: '행각 다섯 채 아래 아픈 사람들이 누워 있다. 모두 물을 바라보고 있다.',
  beats: [{ ref: 'john:5:1-9', note: '한 사람은 아주 오래 여기 누워 있었다고 한다.' }, { ref: 'john:5:10-18' }],
});
add({
  id: '5b',
  ch: 5,
  title: '성전에서',
  sub: '예루살렘 성전 뜰',
  setting: 'temple',
  beats: [{ ref: 'john:5:19-24' }, { ref: 'john:5:25-30' }, { ref: 'john:5:31-38' }, { ref: 'john:5:39-47' }],
});

// ── 6장(6:1–15는 오병이어 스테이지) ──
add({
  id: '6b',
  ch: 6,
  title: '밤바다',
  sub: '갈릴리 바다, 가버나움으로 가는 배',
  setting: 'lake',
  intro: '날이 저물었다. 바람이 세지고 물결이 높다. 배가 흔들린다.',
  beats: [{ ref: 'john:6:16-21' }],
});
add({
  id: '6c',
  ch: 6,
  title: '생명의 떡',
  sub: '가버나움 회당',
  setting: 'synagogue',
  intro: '다음 날, 사람들이 배를 타고 가버나움까지 찾아왔다. 어제 먹은 떡 이야기로 떠들썩하다.',
  beats: [
    { ref: 'john:6:22-27' },
    { ref: 'john:6:28-35' },
    { ref: 'john:6:36-40' },
    { ref: 'john:6:41-51' },
    { ref: 'john:6:52-59' },
    { ref: 'john:6:60-66', note: '사람들이 하나둘 돌아간다. 발소리가 멀어진다.' },
    { ref: 'john:6:67-71' },
  ],
});

// ── 7장 ──
add({
  id: '7a',
  ch: 7,
  title: '갈릴리에서',
  sub: '초막절을 앞둔 갈릴리',
  setting: 'village',
  beats: [{ ref: 'john:7:1-9' }],
});
add({
  id: '7b',
  ch: 7,
  title: '초막절',
  sub: '예루살렘, 명절의 성전',
  setting: 'temple',
  intro: '집집마다 나뭇가지로 초막을 지었다. 명절이라 성전 뜰이 사람들로 붐빈다.',
  beats: [
    { ref: 'john:7:10-13', note: '사람들이 수군거린다. 누구를 찾는 것 같다.' },
    { ref: 'john:7:14-24' },
    { ref: 'john:7:25-31' },
    { ref: 'john:7:32-36' },
    { ref: 'john:7:37-44' },
    { ref: 'john:7:45-53' },
  ],
});

// ── 8장 ──
add({
  id: '8',
  ch: 8,
  title: '세상의 빛',
  sub: '성전 뜰, 헌금함 곁',
  setting: 'temple',
  beats: [
    { ref: 'john:8:1-11', note: '이른 아침, 사람들이 한 여자를 끌고 왔다. 다들 손에 무언가를 쥐고 있다.' },
    { ref: 'john:8:12-20' },
    { ref: 'john:8:21-30' },
    { ref: 'john:8:31-38' },
    { ref: 'john:8:39-47' },
    { ref: 'john:8:48-59' },
  ],
});

// ── 9장 ──
add({
  id: '9',
  ch: 9,
  title: '실로암',
  sub: '예루살렘 남쪽, 실로암 못',
  setting: 'siloam',
  intro: '길가에 앉아 구걸하는 사람이 있다. 날 때부터 앞을 보지 못했다고 한다.',
  beats: [
    { ref: 'john:9:1-7', note: '그 사람이 더듬거리며 못으로 내려가는 계단을 찾는다.' },
    { ref: 'john:9:8-12' },
    { ref: 'john:9:13-17' },
    { ref: 'john:9:18-23' },
    { ref: 'john:9:24-34' },
    { ref: 'john:9:35-41' },
  ],
});

// ── 10장 ──
add({
  id: '10a',
  ch: 10,
  title: '양의 문',
  sub: '돌담을 두른 양 우리',
  setting: 'pasture',
  intro: '해 질 녘, 목자들이 양을 돌담 우리로 몰아넣는다. 양들이 제 목자의 소리를 알아듣는다.',
  beats: [{ ref: 'john:10:1-6' }, { ref: 'john:10:7-10' }, { ref: 'john:10:11-18' }, { ref: 'john:10:19-21' }],
});
add({
  id: '10b',
  ch: 10,
  title: '수전절',
  sub: '겨울, 성전의 솔로몬 행각',
  setting: 'temple',
  beats: [{ ref: 'john:10:22-30' }, { ref: 'john:10:31-39' }],
});
add({
  id: '10c',
  ch: 10,
  title: '다시 요단강 건너편',
  sub: '요한이 처음 세례를 주던 곳',
  setting: 'jordan',
  beats: [{ ref: 'john:10:40-42' }],
});

// ── 11장 ──
add({
  id: '11a',
  ch: 11,
  title: '베다니에서 온 소식',
  sub: '요단강 건너편',
  setting: 'jordan',
  beats: [{ ref: 'john:11:1-6', note: '베다니에서 급한 소식을 든 사람이 왔다.' }, { ref: 'john:11:7-16' }],
});
add({
  id: '11b',
  ch: 11,
  title: '나사로',
  sub: '베다니, 예루살렘에서 오 리쯤',
  setting: 'bethany',
  intro: '마을에 곡하는 소리가 가득하다. 무덤 입구는 큰 돌로 막혀 있다.',
  beats: [
    { ref: 'john:11:17-27' },
    { ref: 'john:11:28-37' },
    { ref: 'john:11:38-44', note: '사람들이 무덤 앞에 모였다. 돌 앞에서 모두 숨을 죽인다.' },
    { ref: 'john:11:45-53' },
    { ref: 'john:11:54-57' },
  ],
});

// ── 12장 ──
add({
  id: '12a',
  ch: 12,
  title: '향유',
  sub: '베다니의 저녁',
  setting: 'bethany',
  beats: [{ ref: 'john:12:1-8', note: '집 안에 향기가 가득 퍼진다. 문밖에 있던 나에게까지 난다.' }, { ref: 'john:12:9-11' }],
});
add({
  id: '12b',
  ch: 12,
  title: '예루살렘으로',
  sub: '성으로 올라가는 길',
  setting: 'road',
  intro: '사람들이 종려나무 가지를 꺾어 들고 길로 나왔다.',
  beats: [{ ref: 'john:12:12-19' }],
});
add({
  id: '12c',
  ch: 12,
  title: '밀알',
  sub: '명절의 성전',
  setting: 'temple',
  beats: [{ ref: 'john:12:20-26' }, { ref: 'john:12:27-36' }, { ref: 'john:12:37-43' }, { ref: 'john:12:44-50' }],
});

// ── 13–17장: 다락방 강화(말씀을 읽는 구간) ──
add({
  id: '13',
  ch: 13,
  title: '발을 씻기심',
  sub: '유월절 전, 다락방',
  setting: 'upper',
  intro: '낮은 식탁 둘레에 사람들이 기대어 앉았다. 등잔 불빛이 흔들린다. 나는 문가에서 물 항아리를 날랐다.',
  beats: [{ ref: 'john:13:1-11', note: '대야와 수건이 놓였다.' }, { ref: 'john:13:12-20' }, { ref: 'john:13:21-30', note: '한 사람이 밤 속으로 나간다.' }, { ref: 'john:13:31-38' }],
});
add({
  id: '14',
  ch: 14,
  title: '길과 진리와 생명',
  sub: '다락방',
  setting: 'upper',
  beats: [{ ref: 'john:14:1-7' }, { ref: 'john:14:8-14' }, { ref: 'john:14:15-24' }, { ref: 'john:14:25-31' }],
});
add({
  id: '15',
  ch: 15,
  title: '참 포도나무',
  sub: '밤, 포도원 곁의 길',
  setting: 'vineyard',
  intro: '모두 일어나 밤길을 나섰다. 길가에 포도나무 가지가 늘어져 있다.',
  beats: [{ ref: 'john:15:1-8' }, { ref: 'john:15:9-17' }, { ref: 'john:15:18-27' }],
});
add({
  id: '16',
  ch: 16,
  title: '보혜사',
  sub: '밤길',
  setting: 'vineyard',
  beats: [{ ref: 'john:16:1-4' }, { ref: 'john:16:5-15' }, { ref: 'john:16:16-24' }, { ref: 'john:16:25-33' }],
});
add({
  id: '17',
  ch: 17,
  title: '기도',
  sub: '밤길',
  setting: 'vineyard',
  beats: [{ ref: 'john:17:1-5' }, { ref: 'john:17:6-19' }, { ref: 'john:17:20-26' }],
});

// ── 18–19장: 수난(원칙 6) ──
add({
  id: '18a',
  ch: 18,
  title: '동산',
  sub: '기드론 시내 건너편',
  setting: 'garden',
  solemn: true,
  intro: '감람나무 사이로 등불과 횃불이 다가온다. 쇠붙이 부딪는 소리가 난다.',
  beats: [
    {
      ref: 'john:18:1-11',
      choice: {
        prompt: '사람들이 흩어진다. 나는…',
        options: ['올리브 나무 뒤에 숨는다', '멀리서 따라간다'],
        flags: ['hid18', 'followed18'],
      },
    },
  ],
});
add({
  id: '18b',
  ch: 18,
  title: '대제사장의 뜰',
  sub: '밤, 숯불 곁',
  setting: 'courtyard',
  solemn: true,
  intro: '밤공기가 차다. 뜰 한가운데 숯불이 피워져 있고, 사람들이 불을 쬐고 있다.',
  beats: [{ ref: 'john:18:12-14' }, { ref: 'john:18:15-18' }, { ref: 'john:18:19-24' }, { ref: 'john:18:25-27', note: '어디선가 닭이 운다.' }],
});
add({
  id: '18c',
  ch: 18,
  title: '관정',
  sub: '새벽, 총독 관저',
  setting: 'praetorium',
  solemn: true,
  beats: [{ ref: 'john:18:28-32' }, { ref: 'john:18:33-38' }, { ref: 'john:18:39-40' }],
});
add({
  id: '19a',
  ch: 19,
  title: '돌을 깐 뜰',
  sub: '총독 관저',
  setting: 'praetorium',
  solemn: true,
  beats: [{ ref: 'john:19:1-7' }, { ref: 'john:19:8-12' }, { ref: 'john:19:13-16' }],
});
add({
  id: '19b',
  ch: 19,
  title: '골고다',
  sub: '성 밖 언덕',
  setting: 'golgotha',
  solemn: true,
  intro: '하늘이 무겁다. 나는 멀리서 지켜본다.',
  beats: [{ ref: 'john:19:17-22' }, { ref: 'john:19:23-27' }, { ref: 'john:19:28-30' }, { ref: 'john:19:31-37' }],
});
add({
  id: '19c',
  ch: 19,
  title: '동산의 새 무덤',
  sub: '해 질 무렵',
  setting: 'tomb',
  solemn: true,
  beats: [{ ref: 'john:19:38-42' }],
});

// ── 20–21장 ──
add({
  id: '20a',
  ch: 20,
  title: '빈 무덤',
  sub: '안식 후 첫날, 새벽',
  setting: 'tomb',
  intro: '아직 어둡다. 무덤 쪽으로 누군가 서둘러 가는 발소리가 들린다.',
  beats: [{ ref: 'john:20:1-10', note: '무덤 입구의 돌이 옮겨져 있다.' }, { ref: 'john:20:11-18' }],
});
add({
  id: '20b',
  ch: 20,
  title: '닫힌 문',
  sub: '그날 저녁',
  setting: 'room',
  intro: '문이 굳게 닫힌 방. 사람들이 두려움에 목소리를 낮추고 있다.',
  beats: [{ ref: 'john:20:19-23' }, { ref: 'john:20:24-29', note: '여드레가 지났다. 오늘은 모두가 모였다.' }, { ref: 'john:20:30-31' }],
});
add({
  id: '21',
  ch: 21,
  title: '디베랴 바닷가',
  sub: '새벽의 갈릴리 바다',
  setting: 'shore',
  intro: '밤새 그물을 던졌지만 아무것도 잡지 못했다. 동이 터 온다. 바닷가에 숯불 연기가 오른다.',
  beats: [
    { ref: 'john:21:1-8' },
    { ref: 'john:21:9-14', note: '숯불 위에 생선과 떡이 놓여 있다. 그날 밤 뜰의 숯불이 떠올랐다.' },
    { ref: 'john:21:15-19' },
    { ref: 'john:21:20-23' },
    { ref: 'john:21:24-25' },
  ],
});
