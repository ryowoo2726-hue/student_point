/**
 * 마석중학교 2학년 2반 상점 데이터 및 개별 학생 시트 연동
 * 구글 스프레드시트: https://docs.google.com/spreadsheets/d/1bxkPwqTH9HWoyVkolJSid7gWk_hX4IligbS61QWoje0/edit
 */

const GOOGLE_SHEET_CONFIG = {
  sheetId: "1bxkPwqTH9HWoyVkolJSid7gWk_hX4IligbS61QWoje0",
  mainGid: "1555944749", // 총 상점 시트
  baseUrl: "https://docs.google.com/spreadsheets/d/1bxkPwqTH9HWoyVkolJSid7gWk_hX4IligbS61QWoje0/gviz/tq?tqx=out:csv"
};

// 2학년 2반 30명 개별 시트 기반 데이터 캐시 (월별 상점 내역 포함)
const DEFAULT_STUDENTS = [
  {
    "id": "20201",
    "number": 1,
    "name": "강예림",
    "gid": "1197958407",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "분리수거",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20202",
    "number": 2,
    "name": "김나율",
    "gid": "1996599958",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20203",
    "number": 3,
    "name": "김서현",
    "gid": "627209814",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20204",
    "number": 4,
    "name": "김신우",
    "gid": "1138479414",
    "points": 8,
    "monthly": [
      {
        "month": "9월",
        "points": 8,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20205",
    "number": 5,
    "name": "김지원",
    "gid": "1838860582",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20206",
    "number": 6,
    "name": "김하윤",
    "gid": "326054233",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20207",
    "number": 7,
    "name": "문예원",
    "gid": "1937674058",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20208",
    "number": 8,
    "name": "박수진",
    "gid": "1505085189",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20209",
    "number": 9,
    "name": "박환이",
    "gid": "119211303",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20210",
    "number": 10,
    "name": "배지완",
    "gid": "1276034265",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20211",
    "number": 11,
    "name": "배하람",
    "gid": "423290201",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20212",
    "number": 12,
    "name": "서유준",
    "gid": "33077614",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20213",
    "number": 13,
    "name": "서준서",
    "gid": "1950932859",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20214",
    "number": 14,
    "name": "선정호",
    "gid": "2120239909",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20215",
    "number": 15,
    "name": "이동하",
    "gid": "1064156933",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20216",
    "number": 16,
    "name": "이루리",
    "gid": "2084254620",
    "points": 7,
    "monthly": [
      {
        "month": "9월",
        "points": 7,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20217",
    "number": 17,
    "name": "임서연",
    "gid": "2029160961",
    "points": 8,
    "monthly": [
      {
        "month": "9월",
        "points": 8,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20218",
    "number": 18,
    "name": "임세빈",
    "gid": "163245096",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20219",
    "number": 19,
    "name": "전예원",
    "gid": "820609551",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20220",
    "number": 20,
    "name": "정지원",
    "gid": "1097621088",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20221",
    "number": 21,
    "name": "조가희",
    "gid": "707105376",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20222",
    "number": 22,
    "name": "조두환",
    "gid": "1170238145",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20223",
    "number": 23,
    "name": "조은찬",
    "gid": "1815500072",
    "points": 8,
    "monthly": [
      {
        "month": "9월",
        "points": 8,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20224",
    "number": 24,
    "name": "지강민",
    "gid": "1096316283",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20225",
    "number": 25,
    "name": "채정우",
    "gid": "1310160946",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20226",
    "number": 26,
    "name": "최다니엘",
    "gid": "648795762",
    "points": 7,
    "monthly": [
      {
        "month": "9월",
        "points": 7,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20227",
    "number": 27,
    "name": "최서영",
    "gid": "287632528",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20228",
    "number": 28,
    "name": "최주원",
    "gid": "1204724772",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20229",
    "number": 29,
    "name": "최태우",
    "gid": "1263660101",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "역할 없음",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  },
  {
    "id": "20230",
    "number": 30,
    "name": "한유라",
    "gid": "1223685119",
    "points": 9,
    "monthly": [
      {
        "month": "9월",
        "points": 9,
        "detail": "9/1 화, 9/2 수, 9/3 목, 9/4 금, 9/7 월, 9/8 화, 9/9 수, 9/10 목, 9/11 금"
      },
      {
        "month": "10월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "11월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "12월",
        "points": 0,
        "detail": ""
      },
      {
        "month": "1월",
        "points": 0,
        "detail": ""
      }
    ],
    "role": "분리수거",
    "extraPoints": 0,
    "history": [],
    "rolePoints": 0
  }
];
