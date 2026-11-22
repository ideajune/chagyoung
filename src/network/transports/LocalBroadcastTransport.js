/**
 * LocalBroadcastTransport — 정적 호스팅/오프라인 환경용 BroadcastChannel 다중 탭 실시간 동기화 폴백 어댑터
 */

import { NETWORK_CONFIG } from '../../config/networkConfig.js';
import { WANDERER_PALETTES, WANDERER_POETIC_NAMES } from '../../config/constants.js';

export class LocalBroadcastTransport {
  constructor(client) {
    this.client = client;
    this.mode = 'local-channel';
    this.channel = null;
    this.allPeers = new Map();
    this.heartbeatTimer = null;
  }

  connect() {
    const c = this.client;
    c.connected = true;

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('cheongpungsa_sansa_multi_v1');
      this.channel.addEventListener('message', (e) => {
        this.handleMessage(e.data);
      });

      this.channel.postMessage({
        type: 'discover_peers',
        senderId: c.selfId
      });

      setTimeout(() => {
        this.assignRoomWithinCapacity();
        this.broadcastPresence();
        c.emitRoomUpdate();
      }, 140);

      this.heartbeatTimer = setInterval(() => {
        this.pruneStalePeers();
        this.broadcastPresence();
      }, NETWORK_CONFIG.heartbeatIntervalMs);
    } else {
      c.emitRoomUpdate();
    }
    return true;
  }

  disconnect() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'peer_leave',
          peerId: this.client.selfId,
          roomId: this.client.roomId
        });
        this.channel.close();
      } catch {
        // ignore
      }
      this.channel = null;
    }
  }

  assignRoomWithinCapacity() {
    const c = this.client;
    if (NETWORK_CONFIG.preferredRoomNumber) {
      c.roomId = NETWORK_CONFIG.preferredRoomNumber;
    } else {
      let candidateRoom = 1;
      while (candidateRoom < 99) {
        let countInRoom = 0;
        for (const p of this.allPeers.values()) {
          if (p.roomId === candidateRoom) countInRoom++;
        }
        if (countInRoom < c.maxCapacity) {
          c.roomId = candidateRoom;
          break;
        }
        candidateRoom++;
      }
    }

    const usedNames = new Set();
    for (const p of this.allPeers.values()) {
      if (p.roomId === c.roomId && p.id !== c.selfId) {
        usedNames.add(p.name);
      }
    }
    if (usedNames.has(c.selfState.name)) {
      const availableName = WANDERER_POETIC_NAMES.find((n) => !usedNames.has(n));
      if (availableName) {
        c.selfState.name = availableName;
        c.callbacks.onAssignedProfile?.({ name: availableName });
      }
    }

    // 같은 산방 내 다른 접속자들과 겹치지 않는 도포 색상 자동 배정
    const paletteCounts = new Array(WANDERER_PALETTES.length).fill(0);
    for (const p of this.allPeers.values()) {
      if (p.roomId === c.roomId && p.id !== c.selfId && Number.isInteger(p.paletteIdx)) {
        paletteCounts[Math.abs(p.paletteIdx) % WANDERER_PALETTES.length] += 1;
      }
    }
    const curPalette = Math.abs(Number(c.selfState.paletteIdx) || 0) % WANDERER_PALETTES.length;
    const minCount = Math.min(...paletteCounts);
    if (paletteCounts[curPalette] > minCount) {
      const nextPalette = paletteCounts.findIndex((cnt) => cnt === minCount);
      if (nextPalette >= 0 && nextPalette !== curPalette) {
        c.selfState.paletteIdx = nextPalette;
        c.callbacks.onAssignedProfile?.({ paletteIdx: nextPalette });
      }
    }

    this.rebuildRoomPeers();
  }

  rebuildRoomPeers() {
    const c = this.client;
    const roomCounts = new Map();
    roomCounts.set(c.roomId, 1);

    const sameRoomList = [];
    for (const p of this.allPeers.values()) {
      if (p.id === c.selfId) continue;
      const rId = p.roomId || 1;
      roomCounts.set(rId, (roomCounts.get(rId) || 0) + 1);
      if (rId === c.roomId) {
        sameRoomList.push(p);
      }
    }

    c.roomSummaries = [...roomCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rId, count]) => ({
        roomId: rId,
        count,
        maxCapacity: c.maxCapacity
      }));

    c.syncPeersSnapshot(sameRoomList);
  }

  pruneStalePeers() {
    const now = performance.now();
    let changed = false;
    for (const [peerId, p] of this.allPeers.entries()) {
      if (now - (p.seenAt || 0) > NETWORK_CONFIG.peerTimeoutMs) {
        this.allPeers.delete(peerId);
        changed = true;
      }
    }
    if (changed) {
      this.rebuildRoomPeers();
      this.client.emitRoomUpdate();
    }
  }

  broadcastPresence() {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'peer_presence',
      roomId: this.client.roomId,
      player: { ...this.client.selfState }
    });
  }

  handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    const c = this.client;

    if (msg.type === 'discover_peers' && msg.senderId !== c.selfId) {
      this.broadcastPresence();
      return;
    }

    if (msg.type === 'peer_presence' && msg.player && msg.player.id !== c.selfId) {
      const prev = this.allPeers.get(msg.player.id);
      this.allPeers.set(msg.player.id, {
        ...prev,
        ...msg.player,
        roomId: msg.roomId || 1,
        seenAt: performance.now()
      });
      this.rebuildRoomPeers();
      c.emitRoomUpdate();
      return;
    }

    if (msg.type === 'peer_leave' && msg.peerId && msg.peerId !== c.selfId) {
      this.allPeers.delete(msg.peerId);
      this.rebuildRoomPeers();
      c.emitRoomUpdate();
      return;
    }

    if (msg.type === 'peer_action' && msg.roomId === c.roomId && msg.peerId !== c.selfId) {
      c.callbacks.onPeerAction?.(msg.peerId, msg.actionType, msg.payload || {});
      return;
    }

    if (msg.type === 'wish_added' && msg.senderId !== c.selfId && msg.wish) {
      c.callbacks.onRemoteWishAdded?.(msg.wish);
      return;
    }

    if (msg.type === 'wish_hapjang' && msg.senderId !== c.selfId && msg.wishId) {
      c.callbacks.onRemoteWishHapjang?.(msg.wishId, msg.hapjang);
    }
  }

  sendState() {
    this.broadcastPresence();
  }

  requestSeat() {
    return null;
  }

  releaseSeat() {
    this.client.publishSelfState({ seatIndex: null, hallSeatIndex: null }, true);
  }

  sendAction(actionType, payload) {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'peer_action',
      roomId: this.client.roomId,
      peerId: this.client.selfId,
      actionType,
      payload
    });
  }

  publishWishAdded(wish) {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'wish_added',
      senderId: this.client.selfId,
      wish
    });
  }

  publishWishHapjang(wishId, hapjang) {
    if (!this.channel) return;
    this.channel.postMessage({
      type: 'wish_hapjang',
      senderId: this.client.selfId,
      wishId,
      hapjang
    });
  }

  async switchRoom(roomNum) {
    const c = this.client;
    c.roomId = roomNum;
    this.rebuildRoomPeers();
    this.broadcastPresence();
    c.emitRoomUpdate();
    return { ok: true, roomId: roomNum };
  }
}
