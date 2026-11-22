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
    this.syncTimer = null;
    this._lastTrackKey = '';
    this._lastTrackAt = 0;
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

      // Supabase Postgres wishes 테이블에서 기존 소원 연등 비동기 로드
      this.loadWishesFromDb();
      return true;
    } catch (err) {
      console.warn('Supabase 연결 실패, 대체 전송 계층으로 전환합니다:', err);
      return false;
    }
  }

  async loadWishesFromDb() {
    if (!this.supabase) return;
    try {
      const { data, error } = await this.supabase
        .from('wishes')
        .select('id, space, color, author, tag, text, date, hapjang')
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) {
        console.warn('[Supabase] 소원 연등 로드 생략(테이블 미생성 등):', error.message);
        return;
      }
      if (Array.isArray(data) && data.length > 0) {
        this.client.callbacks.onWishesSync?.(data);
      }
    } catch (err) {
      console.warn('[Supabase] 소원 연등 로드 오류:', err);
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
      config: {
        presence: { key: c.selfId },
        broadcast: { self: false, ack: false }
      }
    });
    this.channel = channel;

    const sendMyLatestState = () => {
      if (!this.channel || this.channel !== channel) return;
      const snapshot = {
        id: c.selfId,
        name: c.selfState.name,
        paletteIdx: c.selfState.paletteIdx,
        x: Math.round((c.selfState.x || 0) * 100) / 100,
        z: Math.round((c.selfState.z || 0) * 100) / 100,
        yaw: Math.round((c.selfState.yaw || 0) * 100) / 100,
        posture: c.selfState.posture,
        seatIndex: c.selfState.seatIndex,
        hallSeatIndex: c.selfState.hallSeatIndex,
        joinedAt: c.selfState.joinedAt,
        sessionEpoch: c.selfState.sessionEpoch,
        stateSeq: c.selfState.stateSeq || 1
      };
      channel.send({
        type: 'broadcast',
        event: 'peer_state',
        payload: snapshot
      });
    };

    const pruneStalePeers = () => {
      const nowPerf = performance.now();
      const timeoutMs = NETWORK_CONFIG.peerTimeoutMs || 14000;
      let removedAny = false;
      for (const [peerId, peer] of c.peers.entries()) {
        if (peer?.updatedAt && nowPerf - peer.updatedAt > timeoutMs) {
          c.peers.delete(peerId);
          c.callbacks.onPeerLeft?.(peerId, peer);
          removedAny = true;
        }
      }
      if (removedAny) {
        c.emitRoomUpdate();
      }
    };

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const peerEntries = [];
        for (const [key, presences] of Object.entries(state)) {
          if (Array.isArray(presences) && presences.length > 0) {
            peerEntries.push({ ...presences[0], id: key });
          }
        }

        // 방 정원(61명) 초과 입장 시 자동으로 다음 산방으로 이동 (최대 99방 상한 + 재진입 가드)
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

        c.syncPeersSnapshot(peerEntries.filter((p) => p.id !== c.selfId), {
          preserveRecentBroadcastMs: 4500
        });
        c.emitRoomUpdate();
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        // 신규 접속자가 들어오면 가만히 있던 기존 접속자도 즉시 자신의 현재 위치·자세·좌석을 전송
        if (key && key !== c.selfId) {
          sendMyLatestState();
        }
      })
      .on('broadcast', { event: 'request_sync' }, ({ payload }) => {
        if (payload && payload.senderId && payload.senderId !== c.selfId) {
          sendMyLatestState();
        }
      })
      .on('broadcast', { event: 'peer_state' }, ({ payload }) => {
        if (payload && payload.id && payload.id !== c.selfId) {
          const prev = c.peers.get(payload.id) || {};
          const sameEpoch =
            Boolean(prev.sessionEpoch && payload.sessionEpoch) &&
            prev.sessionEpoch === payload.sessionEpoch;
          const prevSeq = Number(prev.stateSeq || 0);
          const nextSeq = Number(payload.stateSeq || 0);
          if (sameEpoch && prevSeq > 0 && nextSeq > 0 && nextSeq < prevSeq) {
            return;
          }
          const merged = {
            ...prev,
            ...payload,
            sessionEpoch: payload.sessionEpoch || prev.sessionEpoch || '',
            stateSeq: sameEpoch ? Math.max(prevSeq, nextSeq) : nextSeq || 1,
            updatedAt: performance.now(),
            lastBroadcastAt: performance.now()
          };
          const isNew = !c.peers.has(payload.id);
          c.peers.set(payload.id, merged);
          if (isNew) {
            c.callbacks.onPeerJoined?.(merged);
            c.emitRoomUpdate();
          } else {
            c.callbacks.onPeerUpdated?.(merged);
          }
        }
      })
      .on('broadcast', { event: 'peer_leave' }, ({ payload }) => {
        const departedId = payload?.peerId;
        if (departedId && departedId !== c.selfId && c.peers.has(departedId)) {
          const departed = c.peers.get(departedId);
          c.peers.delete(departedId);
          c.callbacks.onPeerLeft?.(departedId, departed);
          c.emitRoomUpdate();
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
            // 입장 직후 방 안의 모든 기존 접속자에게 현재 상태 동기화 요청 + 내 상태 1회 전파
            channel.send({
              type: 'broadcast',
              event: 'request_sync',
              payload: { senderId: c.selfId }
            });
            sendMyLatestState();
            if (this.syncTimer) clearInterval(this.syncTimer);
            this.syncTimer = setInterval(() => {
              sendMyLatestState();
              pruneStalePeers();
            }, 4500);
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
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.channel && this.supabase) {
      try {
        this.channel.send({
          type: 'broadcast',
          event: 'peer_leave',
          payload: { peerId: this.client.selfId }
        });
        this.channel.untrack().catch(() => {});
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
    const nowPerf = performance.now();
    const trackKey = `${state.posture}|${state.seatIndex}|${state.hallSeatIndex}|${state.paletteIdx}|${state.name}`;
    const shouldTrackByTime = nowPerf - this._lastTrackAt >= 900;
    if (forceImmediate || trackKey !== this._lastTrackKey || shouldTrackByTime) {
      this._lastTrackKey = trackKey;
      this._lastTrackAt = nowPerf;
      this.channel.track(state).catch(() => {});
    }
  }

  requestSeat() {
    return null;
  }

  releaseSeat() {
    this.client.publishSelfState({ seatIndex: null, hallSeatIndex: null }, true);
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
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'wish_event',
        payload: { kind: 'add', senderId: this.client.selfId, wish }
      });
    }
    if (this.supabase && wish?.id) {
      this.supabase
        .from('wishes')
        .insert({
          id: wish.id,
          space: 'cheongpungsa',
          color: wish.color || 'amber',
          author: String(wish.author || '산사 나그네').slice(0, 30),
          tag: String(wish.tag || '마음 평안').slice(0, 30),
          text: String(wish.text || '').slice(0, 200),
          date: wish.date || '',
          hapjang: 1
        })
        .then(({ error }) => {
          if (error) {
            console.warn('[Supabase] 소원 저장 실패:', error.message);
          }
        })
        .catch(() => {});
    }
  }

  publishWishHapjang(wishId, hapjang) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'wish_event',
        payload: { kind: 'hapjang', senderId: this.client.selfId, wishId, hapjang }
      });
    }
    if (this.supabase && wishId) {
      this.supabase
        .rpc('increment_wish_hapjang', { target_wish_id: wishId })
        .then(({ error }) => {
          if (error) {
            console.warn('[Supabase] 합장 수 저장 실패:', error.message);
          }
        })
        .catch(() => {});
    }
  }

  async switchRoom(roomNum) {
    await this.joinRoom(roomNum);
    return { ok: true, roomId: this.client.roomId };
  }
}
