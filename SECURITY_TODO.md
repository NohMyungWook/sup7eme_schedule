# 보안 TODO

서버리스 Vercel API와 Supabase DB를 함께 사용할 때 추가로 챙겨야 할 항목입니다.

## 운영 환경 변수

- Vercel Production/Preview 환경에 `SESSION_SECRET`을 별도로 등록한다.
- `SESSION_SECRET`은 `SUPABASE_DB_URL`과 분리된 긴 랜덤 문자열로 관리한다.
- 키 교체 시 기존 로그인 세션이 만료될 수 있으므로 배포 타이밍을 조정한다.

## 인증 및 권한

- 현재 API는 HttpOnly 서명 쿠키로 로그인 상태를 확인한다.
- 화면 권한과 별개로 서버 API에서도 메뉴별 `view/create/update/delete` 권한을 검사한다.
- 계정/권한 관리 API는 관리자 전용 정책을 계속 유지한다.

## 데이터 검증

- API 저장 요청은 ID, 날짜, 시간, 색상, 텍스트 길이를 서버에서 검증한다.
- 신규 컬럼이나 신규 API를 추가할 때도 클라이언트 검증에 의존하지 말고 서버 검증을 추가한다.
- 쓰기 API는 직원, 계정, 근무지, 시간대, 스케줄, 휴무, 메모, 규칙 단위로 유지하고 전체 상태 일괄 저장을 다시 도입하지 않는다.

## Supabase / DB

- DB URL은 서버리스 함수에서만 사용하고 클라이언트 번들에 노출하지 않는다.
- 서버리스 함수는 Transaction Pooler 6543 포트와 `api/_db.js`의 최대 1개 연결을 사용한다.
- 같은 요청에서 DB 쿼리 또는 DB 호출 함수를 `Promise.all`, `Promise.allSettled`, 비동기 `map`으로 병렬 실행하지 않는다.
- SQL은 사용자 입력을 문자열로 직접 합치지 말고 파라미터 바인딩을 사용한다.
- 고정 테이블명을 사용하는 동적 SQL도 외부 입력이 섞이지 않는지 변경 시 재점검한다.

## 배포 전 점검

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run test:db-health`
- 개발 서버와 테스트용 Chrome을 실행한 뒤 `npm run test:integration`, `npm run test:ui`, `npm run test:ui:employee`
- 주요 API 인증 실패 케이스 확인:
  - 비로그인 `/api/schedule`
  - 비로그인 `/api/accounts`
  - 권한 없는 계정의 생성/수정/삭제 요청
