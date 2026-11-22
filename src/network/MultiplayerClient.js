/**
 * MultiplayerClient — 청풍사 · 차경루 61인 정원제(차경루 21석 + 본전 실내 40석) 산방 실시간 멀티플레이어 오케스트레이터
 *
 * 전송 계층 자동 탐색 우선순위 (Transport Adapter 패턴):
 * 1) Supabase Realtime (SupabaseTransport)
 * 2) 자체 Node WebSocket 서버 (WebSocketTransport)
 * 3) 브라우저 BroadcastChannel 로컬 다중 탭 동기화 (LocalBroadcastTransport)
 */

import { NETWORK_CONFIG } from '../config/networkConfig.js';
import {
  ANYANGRU_CUSHIONS,
  HALL_CUSHIONS,
  selectPriorityAnyangruCushion,
  getAnyangruCushionByIndex,
  getHallCushionByIndex,
  selectNearestHallCushion
} from '../config/worldConfig.js';
import { WebSocketTransport } from './transports/WebSocketTransport.js';
import { SupabaseTransport } from './transports/SupabaseTransport.js';
import { LocalBroadcastTransport } from './transports/LocalBroadcastTransport.js';

const SESSION_PEER_ID_KEY = 'cheongpungsa_session_peer_id_v1';

function createClientId() {
  try {
    const existing = sessionStorage.getItem(SESSION_PEER_ID_KEY);
    if (existing) return existing;
    const created =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `w-${crypto.randomUUID().slice(0, 10)}`
        : `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem(SESSION_PEER_ID_KEY, created);
    return created;
  } catch {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `w-${crypto.randomUUID().slice(0, 10)}`;
    }
    return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
}

export class MultiplayerClient {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.selfId = createClientId();
    this.roomId = NETWORK_CONFIG.preferredRoomNumber || 1;
    this.maxCapacity = NETWORK_CONFIG.maxRoomCapacity;
    this.transportMode = 'initializing'; // 'supabase' | 'websocket' | 'local-channel'
    this.transport = null;
    this.connected = false;
    this.intentionalClose = false;

    this.sessionEpoch = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    this.selfState = {
      id: this.selfId,
      name: '산사 나그네',
      paletteIdx: 0,
      x: 0,
      z: 1.5,
      yaw: 0,
      posture: 'walk',
      seatIndex: null,
      hallSeatIndex: null,
      joinedAt: Date.now(),
      sessionEpoch: this.sessionEpoch,
      stateSeq: 1
    };

    // peerId -> { id, name, paletteIdx, x, z, yaw, posture, seatIndex, hallSeatIndex, sessionEpoch, stateSeq, updatedAt }
    this.peers = new Map();
    this.roomSummaries = [];

    this.stateSeqCounter = 1;
    this.lastSentAt = 0;
    this.lastSentHash = '';
    this._onUnload = () => this.disconnect();
  }

  async connect(initialSelfState = {}) {
    Object.assign(this.selfState, initialSelfState, {
      id: this.selfId,
      sessionEpoch: this.sessionEpoch
    });
    window.addEventListener('beforeunload', this._onUnload);
    window.addEventListener('pagehide', this._onUnload);

    // 1순위: Supabase 설정이 존재할 경우 서버리스 클라우드 연결
    if (NETWORK_CONFIG.supabaseUrl && NETWORK_CONFIG.supabaseAnonKey) {
      const supa = new SupabaseTransport(this);
      if (await supa.connect()) {
        this.transport = supa;
        this.transportMode = supa.mode;
        return;
      }
    }

    // 2순위: 동일 호스트(/ws) 또는 지정된 WebSocket 중계 서버 탐색
    const ws = new WebSocketTransport(this);
    if (await ws.connect()) {
      this.transport = ws;
      this.transportMode = ws.mode;
      return;
    }

    // 3순위: 정적 서버 / 오프라인 환경에서도 즉시 동작하는 BroadcastChannel 다중 탭 동기화
    const local = new LocalBroadcastTransport(this);
    this.transport = local;
    this.transportMode = local.mode;
    local.connect();
  }

  disconnect() {
    if (this.intentionalClose) return;
    this.intentionalClose = true;
    window.removeEventListener('beforeunload', this._onUnload);
    window.removeEventListener('pagehide', this._onUnload);
    this.transport?.disconnect();
    this.transport = null;
    this.connected = false;
  }

  getVisitorCount() {
    return 1 + this.peers.size;
  }

  getRoomInfo() {
    return {
      roomId: this.roomId,
      visitorCount: this.getVisitorCount(),
      maxCapacity: this.maxCapacity,
      transportMode: this.transportMode,
      connected: this.connected,
      rooms: this.roomSummaries
    };
  }

  getOccupiedSeatsMap(excludeSelf = false) {
    const map = new Map();
    if (!excludeSelf && Number.isInteger(this.selfState.seatIndex)) {
      map.set(this.selfState.seatIndex, {
        peerId: this.selfId,
        name: this.selfState.name,
        isSelf: true
      });
    }
    for (const [peerId, peer] of this.peers.entries()) {
      if (Number.isInteger(peer.seatIndex)) {
        map.set(peer.seatIndex, {
          peerId,
          name: peer.name || '산사 나그네',
          isSelf: false
        });
      } else if (peer.posture === 'kneel' && Number.isFinite(peer.x) && Number.isFinite(peer.z)) {
        for (const c of ANYANGRU_CUSHIONS) {
          if (Math.hypot(peer.x - c.x, peer.z - c.z) <= 0.65 && !map.has(c.index)) {
            map.set(c.index, {
              peerId,
              name: peer.name || '산사 나그네',
              isSelf: false
            });
            break;
          }
        }
      }
    }
    return map;
  }

  getOccupiedHallSeatsMap(excludeSelf = false) {
    const map = new Map();
    if (!excludeSelf && Number.isInteger(this.selfState.hallSeatIndex)) {
      map.set(this.selfState.hallSeatIndex, {
        peerId: this.selfId,
        name: this.selfState.name,
        isSelf: true
      });
    }
    for (const [peerId, peer] of this.peers.entries()) {
      if (Number.isInteger(peer.hallSeatIndex)) {
        map.set(peer.hallSeatIndex, {
          peerId,
          name: peer.name || '산사 나그네',
          isSelf: false
        });
      } else if (peer.posture === 'kneel' && Number.isFinite(peer.x) && Number.isFinite(peer.z)) {
        for (const c of HALL_CUSHIONS) {
          if (Math.hypot(peer.x - c.x, peer.z - c.z) <= 0.65 && !map.has(c.index)) {
            map.set(c.index, {
              peerId,
              name: peer.name || '산사 나그네',
              isSelf: false
            });
            break;
          }
        }
      }
    }
    return map;
  }

  syncPeersSnapshot(peerList, { preserveRecentBroadcastMs = 0 } = {}) {
    const nowPerf = performance.now();
    const incomingIds = new Set();
    for (const p of peerList) {
      if (!p || p.id === this.selfId) continue;
      incomingIds.add(p.id);
      const prev = this.peers.get(p.id);
      const isNew = !prev;
      const sameEpoch =
        Boolean(prev?.sessionEpoch && p.sessionEpoch) && prev.sessionEpoch === p.sessionEpoch;
      const prevSeq = Number(prev?.stateSeq || 0);
      const incomingSeq = Number(p.stateSeq || 0);

      // 같은 세션(sessionEpoch) 내에서만 오래된 Presence 스냅샷이 최신 Broadcast를 덮어쓰지 않도록 보호
      // 새로고침(새 sessionEpoch)이면 무조건 새 위치·자세로 즉시 갱신
      const keepPrevState = Boolean(prev && sameEpoch && prevSeq > incomingSeq);
      const next = keepPrevState
        ? { ...p, ...prev, updatedAt: nowPerf }
        : {
            ...prev,
            ...p,
            sessionEpoch: p.sessionEpoch || prev?.sessionEpoch || '',
            stateSeq: sameEpoch ? Math.max(prevSeq, incomingSeq) : incomingSeq || 1,
            updatedAt: nowPerf
          };

      this.peers.set(p.id, next);
      if (isNew) {
        this.callbacks.onPeerJoined?.(next);
      } else {
        this.callbacks.onPeerUpdated?.(next);
      }
    }

    for (const [existingId, departed] of this.peers.entries()) {
      if (!incomingIds.has(existingId)) {
        if (
          preserveRecentBroadcastMs > 0 &&
          departed?.lastBroadcastAt &&
          nowPerf - departed.lastBroadcastAt < preserveRecentBroadcastMs
        ) {
          continue;
        }
        this.peers.delete(existingId);
        this.callbacks.onPeerLeft?.(existingId, departed);
      }
    }
  }

  /* =========================================================================
     공통 송신 API (현재 활성 Transport 어댑터로 단일 위임)
     ========================================================================= */
  publishSelfState(partialState = {}, forceImmediate = false) {
    Object.assign(this.selfState, partialState);

    const now = performance.now();
    const qx = Math.round((this.selfState.x || 0) * 100) / 100;
    const qz = Math.round((this.selfState.z || 0) * 100) / 100;
    const qy = Math.round((this.selfState.yaw || 0) * 100) / 100;
    const hash = `${qx}|${qz}|${qy}|${this.selfState.posture}|${this.selfState.seatIndex}|${this.selfState.hallSeatIndex}|${this.selfState.paletteIdx}|${this.selfState.name}`;

    if (!forceImmediate) {
      if (hash === this.lastSentHash) return; // 정지·명상 중 패킷 0바이트
      if (now - this.lastSentAt < NETWORK_CONFIG.positionSyncIntervalMs) return;
    }

    this.lastSentAt = now;
    this.lastSentHash = hash;
    const stateSeq = ++this.stateSeqCounter;
    this.selfState.stateSeq = stateSeq;

    const payload = {
      id: this.selfId,
      name: this.selfState.name,
      paletteIdx: this.selfState.paletteIdx,
      x: qx,
      z: qz,
      yaw: qy,
      posture: this.selfState.posture,
      seatIndex: this.selfState.seatIndex,
      hallSeatIndex: this.selfState.hallSeatIndex,
      joinedAt: this.selfState.joinedAt,
      sessionEpoch: this.sessionEpoch,
      stateSeq
    };

    this.transport?.sendState(payload, forceImmediate);

    if (forceImmediate) {
      this.emitRoomUpdate();
    }
  }

  async requestSeat({ zone = 'anyangru', mode = 'auto', seatIndex = null, x = 0, z = 0 } = {}) {
    const targetZone = zone === 'hall' ? 'hall' : 'anyangru';
    const transportResult = await this.transport?.requestSeat({
      zone: targetZone,
      mode,
      seatIndex,
      x,
      z
    });
    if (transportResult) {
      return transportResult;
    }

    const result = this.resolveSeatLocally({ zone: targetZone, mode, seatIndex, x, z });
    if (result.ok) {
      if (result.zone === 'hall' && Number.isInteger(result.hallSeatIndex)) {
        this.selfState.seatIndex = null;
        this.selfState.hallSeatIndex = result.hallSeatIndex;
        this.publishSelfState({ seatIndex: null, hallSeatIndex: result.hallSeatIndex }, true);
      } else if (Number.isInteger(result.seatIndex)) {
        this.selfState.seatIndex = result.seatIndex;
        this.selfState.hallSeatIndex = null;
        this.publishSelfState({ seatIndex: result.seatIndex, hallSeatIndex: null }, true);
      }
    }
    return result;
  }

  resolveSeatLocally({ zone = 'anyangru', mode, seatIndex, x, z }) {
    if (zone === 'hall') {
      const occupiedMap = this.getOccupiedHallSeatsMap(true);
      const occupiedIndices = new Set(occupiedMap.keys());

      if (mode === 'manual') {
        const seat = getHallCushionByIndex(seatIndex);
        if (!seat) {
          return { ok: false, zone: 'hall', reason: 'invalid' };
        }
        if (occupiedIndices.has(seatIndex)) {
          return {
            ok: false,
            zone: 'hall',
            reason: 'occupied',
            seatIndex,
            hallSeatIndex: seatIndex,
            occupantName: occupiedMap.get(seatIndex)?.name || '다른 나그네'
          };
        }
        return { ok: true, zone: 'hall', seatIndex, hallSeatIndex: seatIndex };
      }

      const { cushion } = selectNearestHallCushion(x, z, occupiedIndices);
      if (!cushion) {
        return { ok: false, zone: 'hall', reason: 'full' };
      }
      return { ok: true, zone: 'hall', seatIndex: cushion.index, hallSeatIndex: cushion.index };
    }

    const occupiedMap = this.getOccupiedSeatsMap(true);
    const occupiedIndices = new Set(occupiedMap.keys());

    if (mode === 'manual') {
      const seat = getAnyangruCushionByIndex(seatIndex);
      if (!seat) {
        return { ok: false, zone: 'anyangru', reason: 'invalid' };
      }
      if (occupiedIndices.has(seatIndex)) {
        return {
          ok: false,
          zone: 'anyangru',
          reason: 'occupied',
          seatIndex,
          occupantName: occupiedMap.get(seatIndex)?.name || '다른 나그네'
        };
      }
      return { ok: true, zone: 'anyangru', seatIndex };
    }

    const { cushion } = selectPriorityAnyangruCushion(x, z, occupiedIndices);
    if (cushion) {
      return { ok: true, zone: 'anyangru', seatIndex: cushion.index };
    }

    // 차경루 21석 만석 시 청풍사 실내 빈 방석 자동 배정
    const hallOccupied = new Set(this.getOccupiedHallSeatsMap(true).keys());
    const { cushion: hallCushion } = selectNearestHallCushion(x, z, hallOccupied);
    if (!hallCushion) {
      return { ok: false, zone: 'anyangru', reason: 'full' };
    }
    return { ok: true, zone: 'hall', seatIndex: hallCushion.index, hallSeatIndex: hallCushion.index };
  }

  releaseSeat() {
    if (this.selfState.seatIndex === null && this.selfState.hallSeatIndex === null) return;
    this.selfState.seatIndex = null;
    this.selfState.hallSeatIndex = null;
    this.transport?.releaseSeat();
  }

  sendAction(actionType, payload = {}) {
    this.transport?.sendAction(actionType, payload);
  }

  publishWishAdded(wish) {
    if (!wish) return;
    this.transport?.publishWishAdded(wish);
  }

  publishWishHapjang(wishId, hapjang) {
    if (!wishId) return;
    this.transport?.publishWishHapjang(wishId, hapjang);
  }

  async switchRoom(targetRoomNumber) {
    const roomNum = Math.max(1, Math.min(99, Math.floor(Number(targetRoomNumber) || 1)));
    if (roomNum === this.roomId) return { ok: true, roomId: this.roomId };

    this.selfState.seatIndex = null;
    this.selfState.hallSeatIndex = null;
    if (this.transport) {
      return this.transport.switchRoom(roomNum);
    }
    return { ok: false, roomId: this.roomId };
  }

  emitRoomUpdate() {
    this.callbacks.onRoomUpdate?.(this.getRoomInfo());
  }
}
