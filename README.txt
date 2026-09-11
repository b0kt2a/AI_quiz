AI 묘사 퀴즈 - Render 배포용

구성
- /admin  문제 등록/수정/순서 변경
- /gm     GM 컨트롤
- /screen 행사장 송출 화면

문제 번호 규칙
- 목록의 첫 번째 문제 = 연습문제
- 두 번째 문제부터 문제 01, 문제 02, 문제 03 ...
- Admin에서 순서를 바꾸면 항상 맨 위 문제가 연습문제가 됨

==================================================
1. 로컬에서 확인하기
==================================================
터미널에서:

npm install
npm start

브라우저:
- http://localhost:3000/admin
- http://localhost:3000/gm
- http://localhost:3000/screen

로컬에서 Admin으로 등록한 데이터는 프로젝트의 .local-data 폴더에 저장됨.

==================================================
2. Render 배포
==================================================
이 프로젝트는 Render Persistent Disk를 사용하는 구조임.
Admin에서 등록한 문제 정보, 영상, 포스터가 Persistent Disk에 저장되어
재시작/재배포 후에도 유지됨.

중요: Render Persistent Disk는 유료 Web Service에서 사용 가능함.

권장 방법: render.yaml Blueprint 사용

1) 이 폴더를 GitHub 저장소에 push
   - node_modules 폴더는 올리지 않아도 됨

2) Render Dashboard에서 New > Blueprint 선택

3) GitHub 저장소 연결

4) render.yaml을 읽어서 Web Service 생성

설정값
- Build Command: npm ci
- Start Command: npm start
- Health Check: /health
- DATA_DIR: /var/data/ai-quiz
- Persistent Disk mount path: /var/data
- Disk size: 2 GB (현재 권장, 필요하면 더 크게)

배포 후 주소 예시
- https://서비스이름.onrender.com/admin
- https://서비스이름.onrender.com/gm
- https://서비스이름.onrender.com/screen

==================================================
3. 실제 사용 순서
==================================================
1) /admin 에서 문제 등록
   - 테마 제목
   - 매장명
   - 장르
   - 난이도
   - 플레이타임
   - MP4 영상
   - 정답 포스터

2) 첫 번째 항목은 자동으로 연습문제로 표시됨

3) /screen 을 행사장 노트북/빔 화면에 띄움

4) 운영진은 /gm 접속
   - 여러 브라우저/기기에서 GM 접속 가능
   - 현재 진행 상태가 Socket.IO로 공유됨

GM 버튼
- 문제 시작
- 다시 재생
- 정답 공개
- 다음 문제

'다음 문제'는 대기 화면으로만 이동함.
다음 문제 영상은 반드시 '문제 시작'을 눌러야 재생됨.

==================================================
4. 저장 위치
==================================================
Render:
- 문제 데이터: /var/data/ai-quiz/questions.json
- 영상: /var/data/ai-quiz/uploads/videos
- 포스터: /var/data/ai-quiz/uploads/posters

로컬:
- .local-data/questions.json
- .local-data/uploads/videos
- .local-data/uploads/posters

GitHub에 포함된 public/videos, public/posters 파일도 그대로 사용할 수 있음.
