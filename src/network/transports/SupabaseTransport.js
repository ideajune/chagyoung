/**
 * SupabaseTransport — Supabase Realtime Presence/Broadcast 전송 어댑터 (Vercel 정적 배포 호환)
 */

import { NETWORK_CONFIG } from '../../config/networkConfig.js';

export class SupabaseTransport {
  constructor(client) {
    this.client = client;
    this.mode = 'supabase';
    this.supabase = null;
    this.channel = null;
    this.roomSwitching = false;
  }

  async connect() {
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

      await this.joinRoom(this.client.roomId);
      this.client.connected = true;
      this.client.emitRoomUpdate();
      return true;
    } catch (err) {
      console.warn('Supabase 연결 실패, 대체 전송 계층으로 전환합니다:', err);
      return false;
    }
  }

  async joinRoom(targetRoomId) {
    if (!this.supabase) return;
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
    }

    const c = this.client;
    c.roomId = targetRoomId;
    const channel = this.supabase.channel(`cheongpungsa-room-${targetRoomId}`, {
      config: { presence: { key: c.selfId } }
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

        // 방 정원(21명) 초과 입장 시 자동으로 다음 산방으로 이동 (최대 99방 상한 + 재진입 가드)
        if (peerEntries.length > c.maxCapacity && !this.roomSwitching && targetRoomId < 99) {
          const sorted = [...peerEntries].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
          const myRank = sorted.findIndex((p) => p.id === c.selfId);
          if (myRank >= c.maxCapacity) {
            this.roomSwitching = true;
            this.joinRoom(targetRoomId + 1)
              .catch(() => {})
              .finally(() => {
                this.roomSwitching = false;
              });
            return;
          }
        }

        c.syncPeersSnapshot(peerEntries.filter((p) => p.id !== c.selfId));
        c.emitRoomUpdate();
      })
      .on('broadcast', { event: 'peer_state' }, ({ payload }) => {
        if (payload && payload.id && payload.id !== c.selfId) {
          const prev = c.peers.get(payload.id) || {};
          const merged = { ...prev, ...payload, updatedAt: performance.now() };
          const isNew = !c.peers.has(payload.id);
          c.peers.set(payload.id, merged);
          if (isNew) c.callbacks.onPeerJoined?.(merged);
          else c.callbacks.onPeerUpdated?.(merged);
        }
      })
      .on('broadcast', { event: 'peer_action' }, ({ payload }) => {
        if (payload && payload.peerId && payload.peerId !== c.selfId) {
          c.callbacks.onPeerAction?.(payload.peerId, payload.actionType, payload.payload || {});
        }
      })
      .on('broadcast', { event: 'wish_event' }, ({ payload }) => {
        if (!payload || payload.senderId === c.selfId) return;
        if (payload.kind === 'add' && payload.wish) {
          c.callbacks.onRemoteWishAdded?.(payload.wish);
        } else if (payload.kind === 'hapjang' && payload.wishId) {
          c.callbacks.onRemoteWishHapjang?.(payload.wishId, payload.hapjang);
        }
      });

    await new Promise((resolve, reject) => {
      let settled = false;
      const subTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Supabase channel subscribe timeout'));
        }
      }, 6000);

      channel.subscribe(async (status) => {
        if (settled) return;
        if (status === 'SUBSCRIBED') {
          settled = true;
          clearTimeout(subTimer);
          try {
            await channel.track({ ...c.selfState });
            resolve();
          } catch (err) {
            reject(err);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          settled = true;
          clearTimeout(subTimer);
          reject(new Error(`Supabase channel status: ${status}`));
        }
      });
    });

    this.channel = channel;
  }

  disconnect() {
    if (this.channel && this.supabase) {
      try {
        this.supabase.removeChannel(this.channel);
      } catch {
        // ignore
      }
      this.channel = null;
    }
  }

  sendState(state, forceImmediate) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'peer_state',
      payload: state
    });
    if (forceImmediate) {
      this.channel.track(state).catch(() => {});
    }
  }

  requestSeat() {
    return null;
  }

  releaseSeat() {
    this.client.publishSelfState({ seatIndex: null }, true);
  }

  sendAction(actionType, payload) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'peer_action',
      payload: { peerId: this.client.selfId, actionType, payload }
    });
  }

  publishWishAdded(wish) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'wish_event',
      payload: { kind: 'add', senderId: this.client.selfId, wish }
    });
  }

  publishWishHapjang(wishId, hapjang) {
    if (!this.channel) return;
    this.channel.send({
      type: 'broadcast',
      event: 'wish_event',
      payload: { kind: 'hapjang', senderId: this.client.selfId, wishId, hapjang }
    });
  }

  async switchRoom(roomNum) {
    await this.joinRoom(roomNum);
    return { ok: true, roomId: this.client.roomId };
  }
}
