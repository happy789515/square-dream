# 네모의 꿈

[![Play](https://img.shields.io/badge/Play-네모의%20꿈-00F5D4?style=for-the-badge&logo=githubpages&logoColor=white)](https://happy789515.github.io/square-dream/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![PixiJS](https://img.shields.io/badge/PixiJS-8.14.0-E72264?style=for-the-badge&logo=pixijs&logoColor=white)](https://pixijs.com/)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.20.0-888888?style=for-the-badge)](https://brm.io/matter-js/)

네온 바닥 위를 스스로 구르는 다각형. 사각형에서 시작해 꼭짓점이 늘고, 완벽한 원은 되지 않는다.

탭은 이동이 아니다. 도형은 혼자서 굴러가고, 탭은 다음 형태로 가는 게이지를 채운다.

## 🎮 플레이

| | |
| --- | --- |
| 이동 | 자동. 플레이 중 일시정지는 없다 |
| 탭, 스페이스 | 진화 게이지 |
| 진화 | 현재가 n각이면 n번 탭한 뒤 약 4.4초. 그동안 세계는 멈춘다 |
| 거리 | 화면 상단 가운데. 999m까지는 `999m`, 1000m부터는 `1.00km` |
| 속도 | 4각이 `1.00배`. 꼭짓점 하나마다 0.15배. 메뉴에 소수 둘째 자리로 표시 |

오른쪽 메뉴에는 홈, 수동 저장, 남은 탭, 각 수, 속도, 원에 가까움이 있다. 원에 가까움은 99%에서 멈춘다.

설정은 타이틀에서만 연다. BGM, 효과음, 음소거, 진동, 진행 초기화.

## 🚀 실행

```bash
npm install
npm run generate:assets
npm run dev
```

`generate:assets`는 아이콘과 배경을 만든다. 한 번이면 된다.

```bash
npm run build
npm run preview
```

## 💾 저장

브라우저 `localStorage` 슬롯 하나.

- 10초마다 자동 저장
- 탭을 숨기거나 페이지를 닫을 때 한 번 더 저장
- 메뉴의 수동 저장
- 진화 연출 중에는 저장하지 않고, 연출이 끝난 상태를 남긴다

## 🖼️ 화면

가로 1280×720, 세로 720×1280에 맞춘 뒤 창에 레터박스한다.

## 📱 설치

`npm run build` 결과를 HTTPS 또는 localhost에서 열면 홈 화면에 추가할 수 있다. iOS는 Safari에서 공유 → 홈 화면에 추가. 진동은 기기와 브라우저가 지원할 때만 동작한다.
