/**
 * InputRouter — 3D 뷰포트 포인터(클릭·드래그·멀티터치 핀치), 휠, 키보드 단축키 및 이미지 드롭 단일 라우터
 */

export class InputRouter {
  constructor({ canvas, cameraController, callbacks }) {
    this.canvas = canvas;
    this.cameraController = cameraController;
    this.callbacks = callbacks;

    this.touchPointers = new Map();
    this.pinchStartDist = null;
    this.hadMultiTouch = false;

    this.isPointerDown = false;
    this.pointerDownPos = { x: 0, y: 0 };
    this.pointerDownTime = 0;
    this.pointerMovedDist = 0;

    this.bindPointerEvents();
    this.bindKeyboardEvents();
    this.bindDragAndDrop();
  }

  bindPointerEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      this.touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this.touchPointers.size === 2) {
        const pts = [...this.touchPointers.values()];
        this.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.cameraController.beginPinch();
        this.hadMultiTouch = true;
        this.isPointerDown = false;
        this.cameraController.isDragging = false;
        return;
      }

      if (this.touchPointers.size === 1) {
        this.hadMultiTouch = false;
        this.isPointerDown = true;
        this.cameraController.isDragging = false;
        this.pointerDownPos.x = e.clientX;
        this.pointerDownPos.y = e.clientY;
        this.pointerDownTime = performance.now();
        this.pointerMovedDist = 0;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.touchPointers.has(e.pointerId)) {
        this.touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // 모바일 2손가락 핀치 줌
      if (this.touchPointers.size === 2 && this.pinchStartDist) {
        const pts = [...this.touchPointers.values()];
        const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.cameraController.updatePinch(this.pinchStartDist - curDist);
        return;
      }

      // 1손가락 / 마우스 드래그 시점 회전
      if (this.isPointerDown) {
        const dx = e.clientX - this.pointerDownPos.x;
        const dy = e.clientY - this.pointerDownPos.y;
        this.pointerMovedDist += Math.hypot(dx, dy);
        this.pointerDownPos.x = e.clientX;
        this.pointerDownPos.y = e.clientY;

        const dragThreshold = e.pointerType === 'touch' ? 10 : 4;
        if (this.pointerMovedDist > dragThreshold) {
          this.cameraController.isDragging = true;
          this.cameraController.handleDrag(dx, dy, e.pointerType === 'touch');
        }
        return;
      }

      // 데스크톱 마우스 호버 (3D 연등·풍경종 툴팁)
      if (e.pointerType === 'mouse') {
        this.callbacks.onHover?.(e.clientX, e.clientY);
      }
    });

    const finishPointer = (e) => {
      this.touchPointers.delete(e.pointerId);
      if (this.touchPointers.size < 2) {
        this.pinchStartDist = null;
      }
      if (!this.isPointerDown) return;

      this.isPointerDown = false;
      this.cameraController.isDragging = false;

      const tapMaxMove = e.pointerType === 'touch' ? 22 : 8;
      const tapDuration = performance.now() - (this.pointerDownTime || 0);
      if (
        !this.hadMultiTouch &&
        this.pointerMovedDist < tapMaxMove &&
        tapDuration < 650 &&
        (e.target === this.canvas || this.canvas.contains(e.target))
      ) {
        this.callbacks.onCanvasTap?.(e.clientX, e.clientY);
      }
    };

    window.addEventListener('pointerup', finishPointer);
    window.addEventListener('pointercancel', (e) => {
      this.touchPointers.delete(e.pointerId);
      this.pinchStartDist = null;
      this.isPointerDown = false;
      this.cameraController.isDragging = false;
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.cameraController.handleWheel(e.deltaY);
      },
      { passive: false }
    );
  }

  bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.key === 'Escape') {
        this.callbacks.onEscape?.();
        return;
      }

      if (isTyping) return;

      if (e.code === 'Space') {
        if (this.callbacks.canToggleZen ? this.callbacks.canToggleZen() : true) {
          e.preventDefault();
          this.callbacks.onToggleZen?.();
        }
        return;
      }

      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') {
        this.callbacks.onMoveKey?.('w', true);
      } else if (code === 'KeyS' || code === 'ArrowDown') {
        this.callbacks.onMoveKey?.('s', true);
      } else if (code === 'KeyA' || code === 'ArrowLeft') {
        this.callbacks.onMoveKey?.('a', true);
      } else if (code === 'KeyD' || code === 'ArrowRight') {
        this.callbacks.onMoveKey?.('d', true);
      } else if (code === 'KeyB' || code === 'KeyG') {
        e.preventDefault();
        this.callbacks.onGreet?.();
      } else if (code === 'KeyC') {
        e.preventDefault();
        this.callbacks.onTogglePosture?.();
      } else if (code === 'KeyP') {
        e.preventDefault();
        this.callbacks.onCyclePalette?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.callbacks.onMoveKey?.('w', false);
      else if (code === 'KeyS' || code === 'ArrowDown') this.callbacks.onMoveKey?.('s', false);
      else if (code === 'KeyA' || code === 'ArrowLeft') this.callbacks.onMoveKey?.('a', false);
      else if (code === 'KeyD' || code === 'ArrowRight') this.callbacks.onMoveKey?.('d', false);
    });
  }

  bindDragAndDrop() {
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        this.callbacks.onDropCustomPhoto?.(url);
      }
    });
  }
}
