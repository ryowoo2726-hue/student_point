import { cp, mkdir } from 'node:fs/promises';

// 공개할 파일만 복사합니다. 환경변수 파일과 테스트는 배포하지 않습니다.
await mkdir('dist', { recursive: true });
await cp('app', 'dist/app', { recursive: true });
await cp('index.html', 'dist/index.html');
