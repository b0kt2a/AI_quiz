AI 묘사 퀴즈 - 무료 Render 버전
================================

구조
- /admin  : 문제 관리
- /gm     : 진행자 컨트롤
- /screen : 행사장 송출 화면
- 첫 번째 문제는 항상 '연습문제'
- 두 번째부터 '문제 01', '문제 02' ...

중요: 무료 Render용 저장 방식
-----------------------------
이 버전은 Persistent Disk를 쓰지 않습니다.
영상/포스터/기본 문제 데이터를 GitHub 저장소에 포함해서 배포합니다.

1) 영상 넣기
   public/videos 폴더에 MP4 파일을 넣습니다.

2) 포스터 넣기
   public/posters 폴더에 JPG/PNG/WEBP 파일을 넣습니다.

3) questions.json
   GitHub에 포함되는 기본 문제 목록입니다.
   Admin에서 문제를 정리한 뒤 '설정 백업' 버튼을 누르면 questions.json을 받을 수 있습니다.
   그 파일로 프로젝트 루트의 questions.json을 교체한 뒤 GitHub에 다시 push하면 다음 재시작/재배포 후에도 그대로 유지됩니다.

4) Admin에서 수정
   Admin 수정 내용은 GM/Screen에 즉시 공유됩니다.
   단, 무료 Render 서버가 재시작/재배포되면 GitHub에 들어있는 questions.json 기본값으로 돌아갑니다.
   행사 직전 수정했다면 '설정 백업'을 눌러 questions.json을 받아두는 것을 권장합니다.

Render 설정
-----------
Root Directory : 비워두기
Build Command   : npm ci
Start Command   : npm start
Compute         : Free ($0)
Persistent Disk : 사용하지 않음

render.yaml을 이용해 Blueprint로 배포해도 됩니다.

로컬 테스트
-----------
1. npm install
2. npm start
3. 브라우저:
   http://localhost:3000/admin
   http://localhost:3000/gm
   http://localhost:3000/screen

행사 팁
-------
- 행사 전에 /screen을 한 번 열어 Render를 깨워두세요.
- GM과 Screen은 같은 서버 상태를 Socket.IO로 공유합니다.
- 여러 GM이 동시에 접속해도 같은 진행 상태를 보고 조작할 수 있습니다.
