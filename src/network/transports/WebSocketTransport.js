/**
 * WebSocketTransport — Node 멀티플레이어 중계 서버(/ws) WebSocket 전송 어댑터
 */

import { NETWORK_CONFIG } from '../../config/networkConfig.js';

export class WebSocketTransport {
  constructor(client) {
    this.client = client;
    this.mode = 'websocket';
    this.ws = null;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.reconnectAttempt = 0;
    this.pendingSeatResolvers = new Map();
    this.reqSeq = 0;
  }

  resolveDefaultWsUrl() {
    if (typeof window === 'undefined' || !window.location?.host) return '';
    if (window.location.protocol === 'file:') return '';
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }

  connect() {
    const url = NETWORK_CONFIG.wsUrl || this.resolveDefaultWsUrl();
    if (!url || typeof WebSocket === 'undefined') return Promise.resolve(false);

    return new Promise((resolve) => {
      let settled = false;
      let socket;
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
      }, 2800);

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
        this.reconnectAttempt = 0;
        this.client.connected = true;

        this.send({
          type: 'join',
          preferredRoom: NETWORK_CONFIG.preferredRoomNumber,
          player: { ...this.client.selfState }
        });

        this.startHeartbeat();

        if (!settled) {
          settled = true;
          resolve(true);
        }
      });

      socket.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });

      socket.addEventListener('close', () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(false);
          return;
        }
        this.client.connected = false;
        this.client.emitRoomUpdate();
        if (!this.client.intentionalClose && this.client.transport === this) {
          this.scheduleReconnect();
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

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
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
    this.pendingSeatResolvers.clear();
  }

  startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, NETWORK_CONFIG.heartbeatIntervalMs);
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delayMs = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 5);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.client.intentionalClose) return;
      const ok = await this.connect();
      if (ok) {
        this.reconnectAttempt = 0;
      } else if (!this.client.intentionalClose) {
        this.scheduleReconnect();
      }
    }, delayMs);
  }

  send(payload) {
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

  handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    const c = this.client;
    switch (msg.type) {
      case 'welcome': {
        if (msg.selfId) {
          c.selfId = String(msg.selfId);
          c.selfState.id = c.selfId;
        }
        c.roomId = msg.roomId || 1;
        c.roomSummaries = Array.isArray(msg.rooms) ? msg.rooms : [];
        if (msg.assignedName && msg.assignedName !== c.selfState.name) {
          c.selfState.name = msg.assignedName;
          c.callbacks.onAssignedProfile?.({ name: msg.assignedName });
        }
        if (Number.isInteger(msg.seatIndex) || msg.seatIndex === null) {
          c.selfState.seatIndex = msg.seatIndex;
        }
        if (Number.isInteger(msg.hallSeatIndex) || msg.hallSeatIndex === null) {
          c.selfState.hallSeatIndex = msg.hallSeatIndex;
        }
        c.syncPeersSnapshot(msg.peers || []);
        if (Array.isArray(msg.wishes)) {
          c.callbacks.onWishesSync?.(msg.wishes);
        }
        c.emitRoomUpdate();
        break;
      }

      case 'room_roster': {
        c.roomId = msg.roomId || c.roomId;
        c.roomSummaries = Array.isArray(msg.rooms) ? msg.rooms : c.roomSummaries;
        if (msg.assignedName && msg.assignedName !== c.selfState.name) {
          c.selfState.name = msg.assignedName;
          c.callbacks.onAssignedProfile?.({ name: msg.assignedName });
        }
        c.selfState.seatIndex = Number.isInteger(msg.seatIndex) ? msg.seatIndex : null;
        c.selfState.hallSeatIndex = Number.isInteger(msg.hallSeatIndex) ? msg.hallSeatIndex : null;
        c.syncPeersSnapshot(msg.peers || []);
        c.emitRoomUpdate();
        break;
      }

      case 'rooms_summary': {
        if (Array.isArray(msg.rooms)) {
          c.roomSummaries = msg.rooms;
          c.emitRoomUpdate();
        }
        break;
      }

      case 'peer_joined': {
        if (msg.player && msg.player.id !== c.selfId) {
          c.peers.set(msg.player.id, { ...msg.player, updatedAt: performance.now() });
          c.callbacks.onPeerJoined?.(msg.player);
          c.emitRoomUpdate();
        }
        break;
      }

      case 'peer_state': {
        if (msg.player && msg.player.id !== c.selfId) {
          const prev = c.peers.get(msg.player.id) || {};
          const merged = { ...prev, ...msg.player, updatedAt: performance.now() };
          const isNew = !c.peers.has(msg.player.id);
          c.peers.set(msg.player.id, merged);
          if (isNew) {
            c.callbacks.onPeerJoined?.(merged);
            c.emitRoomUpdate();
          } else {
            c.callbacks.onPeerUpdated?.(merged);
          }
        }
        break;
      }

      case 'peer_left': {
        if (msg.peerId && c.peers.has(msg.peerId)) {
          const departed = c.peers.get(msg.peerId);
          c.peers.delete(msg.peerId);
          c.callbacks.onPeerLeft?.(msg.peerId, departed);
          c.emitRoomUpdate();
        }
        break;
      }

      case 'peer_action': {
        if (msg.peerId && msg.peerId !== c.selfId) {
          c.callbacks.onPeerAction?.(msg.peerId, msg.actionType, msg.payload || {});
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

      case 'wish_added': {
        if (msg.wish) {
          c.callbacks.onRemoteWishAdded?.(msg.wish);
        }
        break;
      }

      case 'wish_hapjang': {
        if (msg.wishId) {
          c.callbacks.onRemoteWishHapjang?.(msg.wishId, msg.hapjang);
        }
        break;
      }

      case 'pong':
      default:
        break;
    }
  }

  sendState(state) {
    this.send({ type: 'state', player: state });
  }

  requestSeat({ zone = 'anyangru', mode, seatIndex, x, z }) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return null;
    }
    const reqId = `seat-${++this.reqSeq}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingSeatResolvers.delete(reqId);
        resolve(this.client.resolveSeatLocally({ zone, mode, seatIndex, x, z }));
      }, 1200);

      this.pendingSeatResolvers.set(reqId, (res) => {
        clearTimeout(timeout);
        if (res.ok) {
          if (res.zone === 'hall' && Number.isInteger(res.hallSeatIndex ?? res.seatIndex)) {
            this.client.selfState.seatIndex = null;
            this.client.selfState.hallSeatIndex = res.hallSeatIndex ?? res.seatIndex;
          } else if (Number.isInteger(res.seatIndex)) {
            this.client.selfState.seatIndex = res.seatIndex;
            this.client.selfState.hallSeatIndex = null;
          }
        }
        resolve(res);
      });

      this.send({ type: 'claim_seat', reqId, zone, mode, seatIndex, x, z });
    });
  }

  releaseSeat() {
    this.send({ type: 'release_seat' });
  }

  sendAction(actionType, payload) {
    this.send({ type: 'action', actionType, payload });
  }

  publishWishAdded(wish) {
    this.send({ type: 'wish_add', wish });
  }

  publishWishHapjang(wishId, hapjang) {
    this.send({ type: 'wish_hapjang', wishId, hapjang });
  }

  async switchRoom(roomNum) {
    this.send({ type: 'switch_room', targetRoom: roomNum });
    return { ok: true, roomId: roomNum };
  }
}
