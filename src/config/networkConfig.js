/**
 * networkConfig.js — 동시 접속 멀티플레이(방당 61명 정원제 · 산방 자동 분리) 설정 단일 원본
 *
 * 지원 전송 계층 (자동 감지 우선순위):
 * 1. Supabase Realtime + Postgres (정적 호스팅 Vercel 배포 시 서버리스 클라우드 동기화)
 * 2. WebSocket Relay Server (로컬 npm run dev 멀티플레이 서버 또는 외부 Node WS 서버)
 * 3. BroadcastChannel + Storage Sync (별도 서버 없을 때 동일 기기 다중 탭 실시간 동기화 폴백)
 */

import { MAX_VISITORS_PER_ROOM } from './worldConfig.js';

const runtimeOverrides =
  (typeof window !== 'undefined' && window.SANSA_NETWORK_CONFIG) || {};

const queryParams =
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

export const NETWORK_CONFIG = Object.freeze({
  // 한 산방(채널)당 최대 동시 입장 인원 = 전체 좌선 방석 수(61석 = 차경루 21석 + 청풍사 본전 실내 40석)
  maxRoomCapacity: MAX_VISITORS_PER_ROOM,

  // 위치/방향/자세 동기화 최소 간격 (100ms = 최대 10Hz, 정지 시 0바이트 전송)
  positionSyncIntervalMs: 100,

  // 접속 유지 하트비트 및 원격 피어 타임아웃
  heartbeatIntervalMs: 4500,
  peerTimeoutMs: 14000,

  // WebSocket 연결 탐색 타임아웃 (초기 WebGL 셰이더 컴파일 시간 고려)
  wsConnectProbeTimeoutMs: 5000,

  // URL 쿼리(?room=2)로 특정 산방 지정 가능 (미지정 시 빈자리가 있는 1산방부터 자동 배정)
  preferredRoomNumber: queryParams?.get('room')
    ? Math.max(1, parseInt(queryParams.get('room'), 10) || 1)
    : null,

  // 1) 선택 사항: Vercel 정적 배포용 Supabase 프로젝트 설정
  supabaseUrl: runtimeOverrides.supabaseUrl || 'https://zdujkubwtgbqkjfewuvo.supabase.co',
  supabaseAnonKey:
    runtimeOverrides.supabaseAnonKey || 'sb_publishable_OUV0-DzE9aPu9hTZotMCIw_w-LW2i5w',

  // 2) 선택 사항: 외부 전용 WebSocket 서버 URL (비워두면 현재 호스트의 /ws 자동 탐색)
  wsUrl: queryParams?.get('ws') || runtimeOverrides.wsUrl || ''
});
