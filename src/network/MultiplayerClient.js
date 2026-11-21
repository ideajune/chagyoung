/**
 * MultiplayerClient.js — 청풍사 · 차경루 21인 정원제 산방(채널) 실시간 멀티플레이 클라이언트
 *
 * 특징:
 * 1. 한 산방(Room) 최대 21명 수용 (차경루 7열 × 3줄 = 21석 1:1 매칭), 초과 시 제2산방·제3산방 자동 증설
 * 2. 산사템플식 초경량 프로토콜: 최대 10Hz(100ms) 위치 송신 + 정지/명상 중 패킷 0바이트 전송
 * 3. 차경루 좌석 배정: 자동 우선순위(1줄 전망석 -> 2줄 중간석 -> 3줄 뒷줄석) 및 수동 지정 좌석 점유 동기화
 * 4. 3단계 자동 전송 계층: Supabase Realtime -> WebSocket(/ws) -> BroadcastChannel(다중 탭 폴백)
 */

import { NETWORK_CONFIG } from '../config/networkConfig.js';
import { WANDERER_POETIC_NAMES } from '../config/constants.js';
import { selectPriorityAnyangruCushion, getAnyangruCushionByIndex } from '../character/Navigation.js';

const SESSION_ID_KEY = 'cheongpungsa_session_peer_id_v1';

function generatePeerId() {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const created = `peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    return `peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export class MultiplayerClient {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.selfId = generatePeerId();
    this.transportMode = 'connecting'; // 'websocket' | 'supabase' | 'local-channel' | 'offline'
    this.connected = false;

    this.roomId = NETWORK_CONFIG.preferredRoomNumber || 1;
    this.maxCapacity = NETWORK_CONFIG.maxRoomCapacity;
    this.roomSummaries = [];

    this.selfState = {
      id: this.selfId,
      name: '산사 나그네',
      paletteIdx: 0,
      x: 0,
      z: 1.5,
      yaw: 0,
      posture: 'walk',
      seatIndex: null,
      joinedAt: Date.now()
    };

    // 같은 산방에 접속한 원격 나그네 상태 맵 (id -> peerState)
    this.peers = new Map();

    this.lastSentHash = '';
    this.lastSentAt = 0;

    this.ws = null;
    this.wsReconnectTimer = null;
    this.intentionalClose = false;
    this.pendingSeatResolvers = new Map();
    this.reqSeq = 0;

    this.broadcastChannel = null;
    this.localAllPeers = new Map(); // BroadcastChannel 모드에서 전체 방 피어 추적
    this.heartbeatTimer = null;

    this.supabase = null;
    this.supaChannel = null;
  }

  async connect(initialSelfState = {}) {
    Object.assign(this.selfState, initialSelfState, { id: this.selfId });

    window.addEventListener('beforeunload', () => this.disconnect());

    // 1순위: Supabase 설정이 존재할 경우 서버리스 클라우드 연결
    if (NETWORK_CONFIG.supabaseUrl && NETWORK_CONFIG.supabaseAnonKey) {
      const ok = await this.tryConnectSupabase();
      if (ok) return;
    }

    // 2순위: 동일 호스트(/ws) 또는 지정된 WebSocket 중계 서버 탐색
    const wsOk = await this.tryConnectWebSocket();
    if (wsOk) return;

    // 3순위: 정적 서버 / 오프라인 환경에서도 즉시 동작하는 BroadcastChannel 다중 탭 동기화
    this.startLocalBroadcastFallback();
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'peer_leave',
          peerId: this.selfId,
          roomId: this.roomId
        });
        this.broadcastChannel.close();
      } catch {
        // ignore
      }
      this.broadcastChannel = null;
    }
    if (this.supaChannel && this.supabase) {
      try {
        this.supabase.removeChannel(this.supaChannel);
      } catch {
        // ignore
      }
    }
  }

  getVisitorCount() {
    return 1 + this.peers.size;
  }

  getRoomInfo() {
    return {
      roomId: this.roomId,
      roomTitle: `청풍명월 제 ${this.roomId}산방`,
      visitorCount: this.getVisitorCount(),
      maxCapacity: this.maxCapacity,
      transportMode: this.transportMode,
      connected: this.connected,
      rooms: this.roomSummaries
    };
  }

  getOccupiedSeatsMap(excludeSelf = false) {
    const occupied = new Map();
    if (!excludeSelf && Number.isInteger(this.selfState.seatIndex)) {
      occupied.set(this.selfState.seatIndex, {
        peerId: this.selfId,
        name: this.selfState.name,
        isSelf: true
      });
    }
    for (const [peerId, peer] of this.peers.entries()) {
      if (Number.isInteger(peer.seatIndex)) {
        occupied.set(peer.seatIndex, {
          peerId,
          name: peer.name || '산사 나그네',
          isSelf: false
        });
      }
    }
    return occupied;
  }

  /* =========================================================================
     1. WebSocket 중계 서버 전송 계층
     ========================================================================= */
  resolveDefaultWsUrl() {
    if (NETWORK_CONFIG.wsUrl) return NETWORK_CONFIG.wsUrl;
    if (typeof window === 'undefined' || !window.location?.host) return '';
    if (window.location.protocol === 'file:') return '';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }

  tryConnectWebSocket() {
    const url = this.resolveDefaultWsUrl();
    if (!url || typeof WebSocket === 'undefined') return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      let socket = null;

      const timer = setTimeout(() => {
        if (!settled) {
          if (socket && socket.readyState === WebSocket.OPEN) return;
          settled = true;
          try {
            socket?.close();
          } catch {
            // ignore
          }
          resolve(false);
        }
      }, NETWORK_CONFIG.wsConnectProbeTimeoutMs);

      try {
        socket = new WebSocket(url);
      } catch {
        clearTimeout(timer);
        resolve(false);
        return;
      }

      socket.addEventListener('open', () => {
        clearTimeout(timer);
        this.ws = socket;
        this.transportMode = 'websocket';
        this.connected = true;

        this.sendWs({
          type: 'join',
          preferredRoom: NETWORK_CONFIG.preferredRoomNumber,
          player: { ...this.selfState }
        });

        this.startWsHeartbeat();

        if (!settled) {
          settled = true;
          resolve(true);
        }
      });

      socket.addEventListener('message', (event) => {
        this.handleWsMessage(event.data);
      });

      socket.addEventListener('close', () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(false);
          return;
        }
        this.connected = false;
        if (!this.intentionalClose && this.transportMode === 'websocket') {
          this.scheduleWsReconnect();
        }
      });

      socket.addEventListener('error', () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          try {
            socket.close();
          } catch {
            // ignore
          }
          resolve(false);
        }
      });
    });
  }

  startWsHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendWs({ type: 'ping' });
      }
    }, NETWORK_CONFIG.heartbeatIntervalMs);
  }

  scheduleWsReconnect() {
    if (this.wsReconnectTimer) return;
    this.wsReconnectTimer = setTimeout(async () => {
      this.wsReconnectTimer = null;
      if (this.intentionalClose) return;
      const ok = await this.tryConnectWebSocket();
      if (!ok && !this.intentionalClose) {
        this.scheduleWsReconnect();
      }
    }, 2600);
  }

  sendWs(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  handleWsMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'welcome': {
        this.roomId = msg.roomId || 1;
        this.roomSummaries = Array.isArray(msg.rooms) ? msg.rooms : [];
        if (msg.assignedName && msg.assignedName !== this.selfState.name) {
          this.selfState.name = msg.assignedName;
          this.callbacks.onAssignedProfile?.({ name: msg.assignedName });
        }
        if (Number.isInteger(msg.seatIndex) || msg.seatIndex === null) {
          this.selfState.seatIndex = msg.seatIndex;
        }
        this.syncPeersSnapshot(msg.peers || []);
        if (Array.isArray(msg.wishes)) {
          this.callbacks.onWishesSync?.(msg.wishes);
        }
        this.emitRoomUpdate();
        break;
      }

      case 'room_roster': {
        this.roomId = msg.roomId || this.roomId;
        this.roomSummaries = Array.isArray(msg.rooms) ? msg.rooms : this.roomSummaries;
        if (msg.assignedName && msg.assignedName !== this.selfState.name) {
          this.selfState.name = msg.assignedName;
          this.callbacks.onAssignedProfile?.({ name: msg.assignedName });
        }
        this.syncPeersSnapshot(msg.peers || []);
        this.emitRoomUpdate();
        break;
      }

      case 'rooms_summary': {
        this.roomSummaries = Array.isArray(msg.rooms) ? msg.rooms : [];
        this.emitRoomUpdate();
        break;
      }

      case 'peer_joined': {
        if (msg.player && msg.player.id !== this.selfId) {
          this.peers.set(msg.player.id, { ...msg.player, updatedAt: performance.now() });
          this.callbacks.onPeerJoined?.(msg.player);
          this.emitRoomUpdate();
        }
        break;
      }

      case 'peer_state': {
        if (msg.player && msg.player.id !== this.selfId) {
          const prev = this.peers.get(msg.player.id) || {};
          const merged = { ...prev, ...msg.player, updatedAt: performance.now() };
          const isNew = !this.peers.has(msg.player.id);
          this.peers.set(msg.player.id, merged);
          if (isNew) {
            this.callbacks.onPeerJoined?.(merged);
            this.emitRoomUpdate();
          } else {
            this.callbacks.onPeerUpdated?.(merged);
          }
        }
        break;
      }

      case 'peer_left': {
        if (msg.peerId && this.peers.has(msg.peerId)) {
          const departed = this.peers.get(msg.peerId);
          this.peers.delete(msg.peerId);
          this.callbacks.onPeerLeft?.(msg.peerId, departed);
          this.emitRoomUpdate();
        }
        break;
      }

      case 'seat_result': {
        const resolver = this.pendingSeatResolvers.get(msg.reqId);
        if (resolver) {
          this.pendingSeatResolvers.delete(msg.reqId);
          resolver(msg);
        }
        break;
      }

      case 'peer_action': {
        if (msg.peerId && msg.peerId !== this.selfId) {
          this.callbacks.onPeerAction?.(msg.peerId, msg.actionType, msg.payload || {});
        }
        break;
      }

      case 'wish_added': {
        if (msg.wish) {
          this.callbacks.onRemoteWishAdded?.(msg.wish);
        }
        break;
      }

      case 'wish_hapjang': {
        if (msg.wishId) {
          this.callbacks.onRemoteWishHapjang?.(msg.wishId, msg.hapjang);
        }
        break;
      }

      default:
        break;
    }
  }

  syncPeersSnapshot(peerList) {
    const incomingIds = new Set();
    for (const p of peerList) {
      if (!p || p.id === this.selfId) continue;
      incomingIds.add(p.id);
      const isNew = !this.peers.has(p.id);
      const next = { ...this.peers.get(p.id), ...p, updatedAt: performance.now() };
      this.peers.set(p.id, next);
      if (isNew) {
        this.callbacks.onPeerJoined?.(next);
      } else {
        this.callbacks.onPeerUpdated?.(next);
      }
    }

    for (const [existingId, departed] of this.peers.entries()) {
      if (!incomingIds.has(existingId)) {
        this.peers.delete(existingId);
        this.callbacks.onPeerLeft?.(existingId, departed);
      }
    }
  }

  /* =========================================================================
     2. Supabase Realtime + Postgres 전송 계층 (Vercel 정적 배포 호환)
     ========================================================================= */
  async tryConnectSupabase() {
    try {
      const mod = await import('https://esm.sh/@supabase/supabase-js@2');
      if (!mod?.createClient) return false;

      this.supabase = mod.createClient(
        NETWORK_CONFIG.supabaseUrl,
        NETWORK_CONFIG.supabaseAnonKey,
        {
          realtime: { params: { eventsPerSecond: 15 } }
        }
      );

      await this.joinSupabaseRoom(this.roomId);
      this.transportMode = 'supabase';
      this.connected = true;
      this.emitRoomUpdate();
      return true;
    } catch (err) {
      console.warn('Supabase 연결 실패, 대체 전송 계층으로 전환합니다:', err);
      return false;
    }
  }

  async joinSupabaseRoom(targetRoomId) {
    if (!this.supabase) return;
    if (this.supaChannel) {
      await this.supabase.removeChannel(this.supaChannel);
      this.supaChannel = null;
    }

    this.roomId = targetRoomId;
    const channelName = `cheongpungsa-room-${targetRoomId}`;
    const channel = this.supabase.channel(channelName, {
      config: { presence: { key: this.selfId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const peerEntries = [];
        for (const [key, presences] of Object.entries(state)) {
          if (Array.isArray(presences) && presences.length > 0) {
            peerEntries.push({ ...presences[0], id: key });
          }
        }

        // 방 정원(21명) 초과 입장 시 자동으로 다음 산방으로 이동
        if (peerEntries.length > this.maxCapacity) {
          const sorted = [...peerEntries].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
          const myRank = sorted.findIndex((p) => p.id === this.selfId);
          if (myRank >= this.maxCapacity) {
            this.joinSupabaseRoom(targetRoomId + 1);
            return;
          }
        }

        this.syncPeersSnapshot(peerEntries.filter((p) => p.id !== this.selfId));
        this.emitRoomUpdate();
      })
      .on('broadcast', { event: 'peer_state' }, ({ payload }) => {
        if (payload && payload.id && payload.id !== this.selfId) {
          const prev = this.peers.get(payload.id) || {};
          const merged = { ...prev, ...payload, updatedAt: performance.now() };
          const isNew = !this.peers.has(payload.id);
          this.peers.set(payload.id, merged);
          if (isNew) this.callbacks.onPeerJoined?.(merged);
          else this.callbacks.onPeerUpdated?.(merged);
        }
      })
      .on('broadcast', { event: 'peer_action' }, ({ payload }) => {
        if (payload && payload.peerId && payload.peerId !== this.selfId) {
          this.callbacks.onPeerAction?.(payload.peerId, payload.actionType, payload.payload || {});
        }
      })
      .on('broadcast', { event: 'wish_event' }, ({ payload }) => {
        if (!payload || payload.senderId === this.selfId) return;
        if (payload.kind === 'add' && payload.wish) {
          this.callbacks.onRemoteWishAdded?.(payload.wish);
        } else if (payload.kind === 'hapjang' && payload.wishId) {
          this.callbacks.onRemoteWishHapjang?.(payload.wishId, payload.hapjang);
        }
      });

    await new Promise((resolve) => {
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ ...this.selfState });
          resolve();
        }
      });
    });

    this.supaChannel = channel;
  }

  /* =========================================================================
     3. BroadcastChannel 로컬 다중 탭 실시간 동기화 폴백
     ========================================================================= */
  startLocalBroadcastFallback() {
    this.transportMode = 'local-channel';
    this.connected = true;

    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('cheongpungsa_sansa_multi_v1');
      this.broadcastChannel.addEventListener('message', (e) => {
        this.handleLocalBroadcastMessage(e.data);
      });

      // 기존 열려 있는 탭들의 상태를 수집한 뒤 21명 정원 이내의 산방 자동 배정
      this.broadcastChannel.postMessage({
        type: 'discover_peers',
        senderId: this.selfId
      });

      setTimeout(() => {
        this.assignLocalRoomWithinCapacity();
        this.broadcastLocalPresence();
        this.emitRoomUpdate();
      }, 140);

      this.heartbeatTimer = setInterval(() => {
        this.pruneStaleLocalPeers();
        this.broadcastLocalPresence();
      }, NETWORK_CONFIG.heartbeatIntervalMs);
    } else {
      this.emitRoomUpdate();
    }
  }

  assignLocalRoomWithinCapacity() {
    if (NETWORK_CONFIG.preferredRoomNumber) {
      this.roomId = NETWORK_CONFIG.preferredRoomNumber;
    } else {
      let candidateRoom = 1;
      while (candidateRoom < 99) {
        let countInRoom = 0;
        for (const p of this.localAllPeers.values()) {
          if (p.roomId === candidateRoom) countInRoom++;
        }
        if (countInRoom < this.maxCapacity) {
          this.roomId = candidateRoom;
          break;
        }
        candidateRoom++;
      }
    }

    // 같은 산방 내 닉네임 중복 시 시적 법명 자동 구분
    const usedNames = new Set();
    for (const p of this.localAllPeers.values()) {
      if (p.roomId === this.roomId && p.id !== this.selfId) {
        usedNames.add(p.name);
      }
    }
    if (usedNames.has(this.selfState.name)) {
      const availableName = WANDERER_POETIC_NAMES.find((n) => !usedNames.has(n));
      if (availableName) {
        this.selfState.name = availableName;
        this.callbacks.onAssignedProfile?.({ name: availableName });
      }
    }

    this.rebuildLocalRoomPeers();
  }

  rebuildLocalRoomPeers() {
    const roomCounts = new Map();
    roomCounts.set(this.roomId, 1);

    const sameRoomList = [];
    for (const p of this.localAllPeers.values()) {
      if (p.id === this.selfId) continue;
      const rId = p.roomId || 1;
      roomCounts.set(rId, (roomCounts.get(rId) || 0) + 1);
      if (rId === this.roomId) {
        sameRoomList.push(p);
      }
    }

    this.roomSummaries = [...roomCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rId, count]) => ({
        roomId: rId,
        count,
        maxCapacity: this.maxCapacity
      }));

    this.syncPeersSnapshot(sameRoomList);
  }

  pruneStaleLocalPeers() {
    const now = performance.now();
    let changed = false;
    for (const [peerId, p] of this.localAllPeers.entries()) {
      if (now - (p.seenAt || 0) > NETWORK_CONFIG.peerTimeoutMs) {
        this.localAllPeers.delete(peerId);
        changed = true;
      }
    }
    if (changed) {
      this.rebuildLocalRoomPeers();
      this.emitRoomUpdate();
    }
  }

  broadcastLocalPresence() {
    if (!this.broadcastChannel) return;
    this.broadcastChannel.postMessage({
      type: 'peer_presence',
      roomId: this.roomId,
      player: { ...this.selfState }
    });
  }

  handleLocalBroadcastMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'discover_peers' && msg.senderId !== this.selfId) {
      this.broadcastLocalPresence();
      return;
    }

    if (msg.type === 'peer_presence' && msg.player && msg.player.id !== this.selfId) {
      const prev = this.localAllPeers.get(msg.player.id);
      this.localAllPeers.set(msg.player.id, {
        ...prev,
        ...msg.player,
        roomId: msg.roomId || 1,
        seenAt: performance.now()
      });
      this.rebuildLocalRoomPeers();
      this.emitRoomUpdate();
      return;
    }

    if (msg.type === 'peer_leave' && msg.peerId && msg.peerId !== this.selfId) {
      this.localAllPeers.delete(msg.peerId);
      this.rebuildLocalRoomPeers();
      this.emitRoomUpdate();
      return;
    }

    if (msg.type === 'peer_action' && msg.roomId === this.roomId && msg.peerId !== this.selfId) {
      this.callbacks.onPeerAction?.(msg.peerId, msg.actionType, msg.payload || {});
      return;
    }

    if (msg.type === 'wish_added' && msg.senderId !== this.selfId && msg.wish) {
      this.callbacks.onRemoteWishAdded?.(msg.wish);
      return;
    }

    if (msg.type === 'wish_hapjang' && msg.senderId !== this.selfId && msg.wishId) {
      this.callbacks.onRemoteWishHapjang?.(msg.wishId, msg.hapjang);
    }
  }

  /* =========================================================================
     공통 송신 API (이동 쓰로틀링 · 좌석 배정 · 합장/타종 · 연등 공유 · 산방 이동)
     ========================================================================= */
  publishSelfState(partialState = {}, forceImmediate = false) {
    Object.assign(this.selfState, partialState);

    const now = performance.now();
    const hash = [
      this.selfState.x.toFixed(3),
      this.selfState.z.toFixed(3),
      this.selfState.yaw.toFixed(3),
      this.selfState.posture,
      this.selfState.seatIndex ?? 'none',
      this.selfState.paletteIdx,
      this.selfState.name
    ].join('|');

    if (!forceImmediate) {
      if (hash === this.lastSentHash) return; // 정지·명상 중 패킷 0바이트
      if (now - this.lastSentAt < NETWORK_CONFIG.positionSyncIntervalMs) return;
    }

    this.lastSentHash = hash;
    this.lastSentAt = now;

    const payload = {
      id: this.selfId,
      name: this.selfState.name,
      paletteIdx: this.selfState.paletteIdx,
      x: Number(this.selfState.x.toFixed(3)),
      z: Number(this.selfState.z.toFixed(3)),
      yaw: Number(this.selfState.yaw.toFixed(3)),
      posture: this.selfState.posture,
      seatIndex: this.selfState.seatIndex
    };

    if (this.transportMode === 'websocket') {
      this.sendWs({ type: 'state', player: payload });
    } else if (this.transportMode === 'supabase' && this.supaChannel) {
      this.supaChannel.send({
        type: 'broadcast',
        event: 'peer_state',
        payload
      });
      if (forceImmediate) {
        this.supaChannel.track({ ...this.selfState }).catch(() => {});
      }
    } else if (this.transportMode === 'local-channel') {
      this.broadcastLocalPresence();
    }

    if (forceImmediate) {
      this.emitRoomUpdate();
    }
  }

  /**
   * 차경루 방석 배정 요청
   * - mode === 'auto': 현재 캐릭터 좌표(x, z)에서 가장 가까운 빈 방석 배정
   * - mode === 'manual': 사용자가 3D에서 직접 클릭한 특정 seatIndex(0~20) 배정 요청
   */
  async requestSeat({ mode = 'auto', seatIndex = null, x = 0, z = 0 } = {}) {
    if (this.transportMode === 'websocket' && this.ws?.readyState === WebSocket.OPEN) {
      const reqId = `seat-${++this.reqSeq}`;
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.pendingSeatResolvers.delete(reqId);
          resolve(this.resolveSeatLocally({ mode, seatIndex, x, z }));
        }, 1200);

        this.pendingSeatResolvers.set(reqId, (res) => {
          clearTimeout(timeout);
          if (res.ok && Number.isInteger(res.seatIndex)) {
            this.selfState.seatIndex = res.seatIndex;
          }
          resolve(res);
        });

        this.sendWs({
          type: 'claim_seat',
          reqId,
          mode,
          seatIndex,
          x: Number(x.toFixed(3)),
          z: Number(z.toFixed(3))
        });
      });
    }

    const result = this.resolveSeatLocally({ mode, seatIndex, x, z });
    if (result.ok && Number.isInteger(result.seatIndex)) {
      this.selfState.seatIndex = result.seatIndex;
      this.publishSelfState({ seatIndex: result.seatIndex }, true);
    }
    return result;
  }

  resolveSeatLocally({ mode, seatIndex, x, z }) {
    const occupiedMap = this.getOccupiedSeatsMap(true);
    const occupiedIndices = new Set(occupiedMap.keys());

    if (mode === 'manual') {
      const seat = getAnyangruCushionByIndex(seatIndex);
      if (!seat) {
        return { ok: false, reason: 'invalid_seat' };
      }
      if (occupiedIndices.has(seatIndex)) {
        const holder = occupiedMap.get(seatIndex);
        return {
          ok: false,
          reason: 'occupied',
          seatIndex,
          occupantName: holder?.name || '다른 나그네'
        };
      }
      return { ok: true, seatIndex };
    }

    const { cushion } = selectPriorityAnyangruCushion(x, z, occupiedIndices);
    if (!cushion) {
      return { ok: false, reason: 'full' };
    }
    return { ok: true, seatIndex: cushion.index };
  }

  releaseSeat() {
    if (this.selfState.seatIndex === null) return;
    this.selfState.seatIndex = null;

    if (this.transportMode === 'websocket') {
      this.sendWs({ type: 'release_seat' });
    }
    this.publishSelfState({ seatIndex: null }, true);
  }

  sendAction(actionType, payload = {}) {
    if (this.transportMode === 'websocket') {
      this.sendWs({ type: 'action', actionType, payload });
    } else if (this.transportMode === 'supabase' && this.supaChannel) {
      this.supaChannel.send({
        type: 'broadcast',
        event: 'peer_action',
        payload: { peerId: this.selfId, actionType, payload }
      });
    } else if (this.transportMode === 'local-channel' && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'peer_action',
        roomId: this.roomId,
        peerId: this.selfId,
        actionType,
        payload
      });
    }
  }

  publishWishAdded(wish) {
    if (!wish) return;
    if (this.transportMode === 'websocket') {
      this.sendWs({ type: 'wish_add', wish });
    } else if (this.transportMode === 'supabase' && this.supaChannel) {
      this.supaChannel.send({
        type: 'broadcast',
        event: 'wish_event',
        payload: { senderId: this.selfId, kind: 'add', wish }
      });
    } else if (this.transportMode === 'local-channel' && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'wish_added',
        senderId: this.selfId,
        wish
      });
    }
  }

  publishWishHapjang(wishId, hapjang) {
    if (!wishId) return;
    if (this.transportMode === 'websocket') {
      this.sendWs({ type: 'wish_hapjang', wishId, hapjang });
    } else if (this.transportMode === 'supabase' && this.supaChannel) {
      this.supaChannel.send({
        type: 'broadcast',
        event: 'wish_event',
        payload: { senderId: this.selfId, kind: 'hapjang', wishId, hapjang }
      });
    } else if (this.transportMode === 'local-channel' && this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'wish_hapjang',
        senderId: this.selfId,
        wishId,
        hapjang
      });
    }
  }

  async switchRoom(targetRoomNumber) {
    const roomNum = Math.max(1, Math.min(99, Number(targetRoomNumber) || 1));
    if (roomNum === this.roomId) return { ok: true, roomId: this.roomId };

    this.releaseSeat();

    if (this.transportMode === 'websocket') {
      this.sendWs({
        type: 'switch_room',
        targetRoom: roomNum,
        player: { ...this.selfState, seatIndex: null }
      });
      return { ok: true, roomId: roomNum };
    }

    if (this.transportMode === 'supabase') {
      await this.joinSupabaseRoom(roomNum);
      this.emitRoomUpdate();
      return { ok: true, roomId: this.roomId };
    }

    if (this.transportMode === 'local-channel') {
      this.roomId = roomNum;
      this.rebuildLocalRoomPeers();
      this.broadcastLocalPresence();
      this.emitRoomUpdate();
      return { ok: true, roomId: this.roomId };
    }

    return { ok: false };
  }

  emitRoomUpdate() {
    this.callbacks.onRoomUpdate?.(this.getRoomInfo());
  }
}
