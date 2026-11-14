/**
 * TextureFactory — 전통 현판 서예, 기와 지붕, 단풍잎, 연등 및 소백산맥 원경 파노라마 절차적 캔버스 텍스처 팩토리
 */

import { LANTERN_COLORS } from '../config/constants.js';

const C_ENGINE = window.SANSA_CORE;

export class TextureFactory {
  /**
   * 차경루(借景樓) 등 누각용 우횡서(借景樓 -> 화면 좌측부터 '樓 景 借') 전통 목조 현판 및 좌측 낙관 인장 텍스처
   */
  static createPlaqueTexture(hanjaText, options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    const isRtl = options.rtl !== false;

    const frameGrad = ctx.createLinearGradient(0, 0, 0, 540);
    frameGrad.addColorStop(0, '#5a3d29');
    frameGrad.addColorStop(0.5, '#462e1e');
    frameGrad.addColorStop(1, '#332014');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(0, 0, 1536, 540);

    ctx.strokeStyle = 'rgba(165, 124, 90, 0.45)';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1516, 520);

    ctx.fillStyle = '#24160e';
    ctx.fillRect(38, 38, 1460, 464);
    ctx.strokeStyle = '#6c4b33';
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 42, 1452, 456);

    const bgGrad = ctx.createLinearGradient(0, 50, 0, 490);
    bgGrad.addColorStop(0, '#1e130c');
    bgGrad.addColorStop(0.45, '#2b1c13');
    bgGrad.addColorStop(1, '#190f09');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(50, 50, 1436, 440);

    for (let y = 58; y < 484; y += 10) {
      ctx.strokeStyle = y % 20 === 0 ? 'rgba(0, 0, 0, 0.28)' : 'rgba(92, 64, 44, 0.11)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.bezierCurveTo(510, y + Math.sin(y * 0.12) * 4, 1020, y - Math.cos(y * 0.12) * 4, 1486, y);
      ctx.stroke();
    }

    for (let i = 0; i < 28; i++) {
      const px = 90 + ((i * 251) % 1350);
      const py = 75 + ((i * 137) % 380);
      const rad = 32 + (i % 5) * 20;
      const pGrad = ctx.createRadialGradient(px, py, 3, px, py, rad);
      pGrad.addColorStop(0, 'rgba(115, 86, 62, 0.08)');
      pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = pGrad;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }

    const rawChars = String(hanjaText || '')
      .replace(/\s+/g, '')
      .split('')
      .filter(Boolean);
    const chars = isRtl ? rawChars.slice().reverse() : rawChars;
    const count = Math.max(1, chars.length);
    const fontSize = count >= 4 ? 220 : 272;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontSize}px "Batang", "Gungsuh", "Nanum Myeongjo", "Noto Serif KR", "AppleMyungjo", serif`;

    const innerLeft = 365;
    const innerRight = 1245;
    chars.forEach((ch, idx) => {
      const cx =
        count === 1
          ? 805
          : innerLeft + (idx / (count - 1)) * (innerRight - innerLeft);
      ctx.save();
      ctx.translate(cx, 274);
      ctx.scale(1.05, 0.97);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillText(ch, 5, 7);

      const goldGrad = ctx.createLinearGradient(0, -130, 0, 130);
      goldGrad.addColorStop(0, '#ebd8b0');
      goldGrad.addColorStop(0.5, '#d5bc90');
      goldGrad.addColorStop(1, '#b69968');
      ctx.fillStyle = goldGrad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.80)';
      ctx.shadowBlur = 14;
      ctx.fillText(ch, 0, 0);

      ctx.strokeStyle = 'rgba(242, 224, 190, 0.42)';
      ctx.lineWidth = 3.2;
      ctx.strokeText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // 좌측 하단 전통 주사(朱砂) 낙관 인장
    ctx.save();
    const sealX = 132;
    const sealY = 336;
    const sealSize = 64;
    ctx.fillStyle = 'rgba(162, 46, 34, 0.82)';
    ctx.fillRect(sealX - sealSize * 0.5, sealY - sealSize * 0.5, sealSize, sealSize);
    ctx.strokeStyle = 'rgba(235, 198, 168, 0.72)';
    ctx.lineWidth = 3;
    ctx.strokeRect(sealX - sealSize * 0.5 + 4, sealY - sealSize * 0.5 + 4, sealSize - 8, sealSize - 8);
    ctx.fillStyle = 'rgba(244, 226, 204, 0.88)';
    ctx.font = '700 22px "Batang", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('淸風', sealX, sealY - 11);
    ctx.fillText('借景', sealX, sealY + 13);
    ctx.restore();

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  /**
   * 청풍사(淸風寺) 본전 고해상도(1536×540) 전통 대편액 현판 텍스처
   * - 감청흑색 고목 바탕 + 당초·연화 조각 액자 테두리 + 양각 금박 우횡서('淸 風 寺' -> 좌측부터 '寺 風 淸')
   */
  static createMainHallPlaqueTexture(hanjaText = '淸 風 寺', options = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 540;
    const ctx = canvas.getContext('2d');

    const isRtl = options.rtl !== false;

    // 1. 고목 조각 액자 테두리 바탕
    const frameGrad = ctx.createLinearGradient(0, 0, 1536, 540);
    frameGrad.addColorStop(0, '#625140');
    frameGrad.addColorStop(0.5, '#4b3d30');
    frameGrad.addColorStop(1, '#362b21');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(0, 0, 1536, 540);

    // 테두리 당초·연화 문양 조각 질감
    ctx.strokeStyle = 'rgba(186, 166, 134, 0.36)';
    ctx.lineWidth = 3.5;
    for (let x = 84; x <= 1452; x += 54) {
      ctx.beginPath();
      ctx.arc(x, 26, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, 514, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let y = 78; y <= 462; y += 54) {
      ctx.beginPath();
      ctx.arc(26, y, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(1510, y, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. 내부 단차 몰딩
    ctx.strokeStyle = '#8a775e';
    ctx.lineWidth = 8;
    ctx.strokeRect(54, 52, 1428, 436);
    ctx.strokeStyle = '#1d1610';
    ctx.lineWidth = 7;
    ctx.strokeRect(64, 62, 1408, 416);

    // 3. 감청흑색 고목 현판 판면
    const boardGrad = ctx.createLinearGradient(70, 68, 1466, 472);
    boardGrad.addColorStop(0, '#121b17');
    boardGrad.addColorStop(0.5, '#1c2823');
    boardGrad.addColorStop(1, '#0f1613');
    ctx.fillStyle = boardGrad;
    ctx.fillRect(70, 68, 1396, 404);

    // 가로 고목 나뭇결 및 은은한 세월 흔적
    for (let y = 76; y < 466; y += 11) {
      ctx.strokeStyle = y % 22 === 0 ? 'rgba(0, 0, 0, 0.30)' : 'rgba(114, 138, 122, 0.08)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(70, y);
      ctx.bezierCurveTo(520, y + Math.sin(y * 0.14) * 3.5, 1020, y - Math.cos(y * 0.14) * 3.5, 1466, y);
      ctx.stroke();
    }

    // 네 귀퉁이 장식 못(두정)
    ctx.fillStyle = '#7b8876';
    for (const [cx, cy] of [
      [30, 30],
      [1506, 30],
      [30, 510],
      [1506, 510]
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. 양각 황금박 서예 ('淸 風 寺' 3글자 여유 배치)
    const rawChars = String(hanjaText || '淸風寺')
      .replace(/\s+/g, '')
      .split('')
      .filter(Boolean);
    const chars = isRtl ? rawChars.slice().reverse() : rawChars;
    const count = Math.max(1, chars.length);
    const fontSize = count >= 4 ? 224 : 278;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontSize}px "Batang", "Gungsuh", "Nanum Myeongjo", "Noto Serif KR", "AppleMyungjo", serif`;

    const innerLeft = 376;
    const innerRight = 1236;
    chars.forEach((ch, idx) => {
      const cx =
        count === 1
          ? 806
          : innerLeft + (idx / (count - 1)) * (innerRight - innerLeft);
      ctx.save();
      ctx.translate(cx, 274);
      ctx.scale(1.05, 0.96);

      // 깊은 양각 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.90)';
      ctx.fillText(ch, 6, 8);

      // 고색 황금빛 본체
      const goldGrad = ctx.createLinearGradient(0, -135, 0, 135);
      goldGrad.addColorStop(0, '#f6e7b8');
      goldGrad.addColorStop(0.5, '#e3cf8f');
      goldGrad.addColorStop(1, '#c4ab67');
      ctx.fillStyle = goldGrad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.76)';
      ctx.shadowBlur = 15;
      ctx.fillText(ch, 0, 0);

      // 윤곽 하이라이트
      ctx.strokeStyle = 'rgba(255, 245, 210, 0.54)';
      ctx.lineWidth = 3.5;
      ctx.strokeText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();

    // 좌측 낙관 인장
    ctx.save();
    const sealX = 148;
    const sealY = 332;
    const sealSize = 66;
    ctx.fillStyle = 'rgba(166, 46, 34, 0.84)';
    ctx.fillRect(sealX - sealSize * 0.5, sealY - sealSize * 0.5, sealSize, sealSize);
    ctx.strokeStyle = 'rgba(238, 206, 174, 0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(sealX - sealSize * 0.5 + 4, sealY - sealSize * 0.5 + 4, sealSize - 8, sealSize - 8);
    ctx.fillStyle = 'rgba(248, 234, 212, 0.90)';
    ctx.font = '700 22px "Batang", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('淸風', sealX, sealY - 11);
    ctx.fillText('道場', sealX, sealY + 13);
    ctx.restore();

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  static createMuryangSquarePlaqueTexture() {
    return TextureFactory.createMainHallPlaqueTexture('淸 風 寺', { rtl: true });
  }

  static createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 8, 128, 128, 122);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.58)');
    grad.addColorStop(0.35, 'rgba(242, 246, 250, 0.34)');
    grad.addColorStop(0.7, 'rgba(225, 234, 242, 0.11)');
    grad.addColorStop(1, 'rgba(225, 234, 242, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    return new C_ENGINE.CanvasTexture(canvas);
  }

  static createGlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 124);
    grad.addColorStop(0, 'rgba(255, 248, 220, 1)');
    grad.addColorStop(0.28, 'rgba(245, 158, 11, 0.46)');
    grad.addColorStop(0.65, 'rgba(245, 158, 11, 0.12)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    return new C_ENGINE.CanvasTexture(canvas);
  }

  static createContactShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
    grad.addColorStop(0, 'rgba(18, 16, 12, 0.72)');
    grad.addColorStop(0.5, 'rgba(18, 16, 12, 0.32)');
    grad.addColorStop(1, 'rgba(18, 16, 12, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new C_ENGINE.CanvasTexture(canvas);
  }

  static createLanternTexture(colorKey) {
    const palette = LANTERN_COLORS[colorKey] || LANTERN_COLORS.amber;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const lGrad = ctx.createLinearGradient(0, 0, 0, 256);
    lGrad.addColorStop(0, palette.edge);
    lGrad.addColorStop(0.22, palette.mid);
    lGrad.addColorStop(0.5, palette.core);
    lGrad.addColorStop(0.78, palette.mid);
    lGrad.addColorStop(1, palette.edge);
    ctx.fillStyle = lGrad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(45, 20, 8, 0.24)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  static createSobaeksanVistaTexture(onPhotoLoaded) {
    const W = 2560;
    const H = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const applyEdgeAlphaFeather = () => {
      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;
      for (let y = 0; y < H; y++) {
        const v = y / H;
        let alphaY = 1.0;
        if (v < 0.04) {
          alphaY = v / 0.04;
          alphaY = alphaY * alphaY * (3 - 2 * alphaY);
        } else if (v > 0.90) {
          alphaY = (1.0 - v) / 0.10;
          alphaY = alphaY * alphaY * (3 - 2 * alphaY);
        }

        for (let x = 0; x < W; x++) {
          const u = x / W;
          let alphaX = 1.0;
          if (u < 0.09) {
            alphaX = u / 0.09;
            alphaX = alphaX * alphaX * (3 - 2 * alphaX);
          } else if (u > 0.91) {
            alphaX = (1.0 - u) / 0.09;
            alphaX = alphaX * alphaX * (3 - 2 * alphaX);
          }

          if (alphaX < 1.0 || alphaY < 1.0) {
            const idx = (y * W + x) * 4;
            data[idx + 3] = Math.round(data[idx + 3] * alphaX * alphaY);
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    };

    const drawNaturalPhotographedForestBase = (img) => {
      const patchCanvas = document.createElement('canvas');
      const pw = 640;
      const ph = 360;
      patchCanvas.width = pw;
      patchCanvas.height = ph;
      const pctx = patchCanvas.getContext('2d');

      const sx = Math.round(img.width * 0.01);
      const sy = Math.round(img.height * 0.515);
      const sw = Math.round(img.width * 0.36);
      const sh = Math.round(img.height * 0.145);
      pctx.drawImage(img, sx, sy, sw, sh, 0, 0, pw, ph);

      const startY = Math.floor(H * 0.48);
      const fillH = H - startY;
      const tileCols = 5;
      const tileW = Math.ceil(W / tileCols);

      for (let i = 0; i < tileCols; i++) {
        ctx.save();
        const dx = i * tileW;
        if (i % 2 === 1) {
          ctx.translate(dx + tileW, startY);
          ctx.scale(-1, 1);
          ctx.drawImage(patchCanvas, 0, 0, pw, ph, 0, 0, tileW + 2, fillH);
        } else {
          ctx.drawImage(patchCanvas, 0, 0, pw, ph, dx, startY, tileW + 2, fillH);
        }
        ctx.restore();
      }

      const seamCanvas = document.createElement('canvas');
      seamCanvas.width = pw;
      seamCanvas.height = ph;
      const sctx = seamCanvas.getContext('2d');
      sctx.drawImage(patchCanvas, 0, 0);
      const sData = sctx.getImageData(0, 0, pw, ph);
      const sd = sData.data;
      for (let py = 0; py < ph; py++) {
        const vy = py / ph;
        const ay = vy < 0.18 ? vy / 0.18 : 1.0;
        for (let px = 0; px < pw; px++) {
          const ux = px / pw;
          const ax = Math.sin(ux * Math.PI);
          sd[(py * pw + px) * 4 + 3] = Math.round(255 * ax * ay * 0.85);
        }
      }
      sctx.putImageData(sData, 0, 0);

      for (let i = 0; i < tileCols; i++) {
        const dx = Math.round((i - 0.5) * tileW);
        ctx.drawImage(seamCanvas, 0, 0, pw, ph, dx, startY + 12, tileW, fillH - 12);
      }

      const valleyGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
      valleyGrad.addColorStop(0, 'rgba(22, 34, 20, 0.0)');
      valleyGrad.addColorStop(1, 'rgba(18, 28, 16, 0.45)');
      ctx.fillStyle = valleyGrad;
      ctx.fillRect(0, Math.floor(H * 0.72), W, Math.ceil(H * 0.28));
    };

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;

    const refImg = new Image();
    refImg.crossOrigin = 'anonymous';
    refImg.onload = () => {
      try {
        ctx.clearRect(0, 0, W, H);
        drawNaturalPhotographedForestBase(refImg);

        const off = document.createElement('canvas');
        const destH = Math.round(H * 0.74);
        off.width = W;
        off.height = destH;
        const octx = off.getContext('2d');

        const srcCropH = Math.round(refImg.height * 0.60);
        octx.drawImage(refImg, 0, 0, refImg.width, srcCropH, 0, 0, W, destH);

        const imgData = octx.getImageData(0, 0, W, destH);
        const data = imgData.data;

        for (let y = 0; y < destH; y++) {
          const v = y / destH;
          for (let x = 0; x < W; x++) {
            const u = x / W;
            const centerRoofMask = Math.exp(-Math.pow((u - 0.48) / 0.11, 2));
            const fadeStart = 0.86 - centerRoofMask * 0.13;
            const fadeEnd = 0.98 - centerRoofMask * 0.11;

            if (v > fadeStart) {
              let alphaY = Math.max(0, Math.min(1, 1.0 - (v - fadeStart) / (fadeEnd - fadeStart)));
              alphaY = alphaY * alphaY * (3 - 2 * alphaY);
              const idx = (y * W + x) * 4;
              data[idx + 3] = Math.round(data[idx + 3] * alphaY);
            }
          }
        }

        octx.putImageData(imgData, 0, 0);
        ctx.drawImage(off, 0, 0);
        applyEdgeAlphaFeather();

        tex.needsUpdate = true;
        if (typeof onPhotoLoaded === 'function') onPhotoLoaded(tex);
      } catch (err) {
        console.warn('Sobaeksan vista photo composite fallback:', err);
      }
    };
    refImg.src = 'assets/environment/mountain-vista.jpg';

    return tex;
  }

  static createRealisticGiwaRoofTexture() {
    const W = 1024;
    const H = 1024;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = W;
    colorCanvas.height = H;
    const ctx = colorCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = W;
    bumpCanvas.height = H;
    const bctx = bumpCanvas.getContext('2d');

    ctx.fillStyle = '#2d3336';
    ctx.fillRect(0, 0, W, H);
    bctx.fillStyle = '#606060';
    bctx.fillRect(0, 0, W, H);

    const cols = 4;
    const colW = W / cols;
    const rows = 14;
    const rowH = H / rows;

    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let c = 0; c < cols; c++) {
      const x0 = c * colW;
      const suW = colW * 0.42;
      const amW = colW - suW;

      for (let r = 0; r < rows; r++) {
        const y0 = r * rowH;
        const shade = (rand() - 0.5) * 10;
        const baseR = Math.round(40 + shade);
        const baseG = Math.round(46 + shade);
        const baseB = Math.round(50 + shade);

        const amGrad = ctx.createLinearGradient(x0, 0, x0 + amW, 0);
        amGrad.addColorStop(0.0, `rgb(${baseR - 14}, ${baseG - 14}, ${baseB - 14})`);
        amGrad.addColorStop(0.25, `rgb(${baseR + 4}, ${baseG + 5}, ${baseB + 6})`);
        amGrad.addColorStop(0.5, `rgb(${baseR + 12}, ${baseG + 14}, ${baseB + 16})`);
        amGrad.addColorStop(0.75, `rgb(${baseR + 3}, ${baseG + 4}, ${baseB + 5})`);
        amGrad.addColorStop(1.0, `rgb(${baseR - 16}, ${baseG - 16}, ${baseB - 16})`);
        ctx.fillStyle = amGrad;
        ctx.fillRect(x0, y0, amW, rowH);

        const bAmGrad = bctx.createLinearGradient(x0, 0, x0 + amW, 0);
        bAmGrad.addColorStop(0.0, '#4a4a4a');
        bAmGrad.addColorStop(0.5, '#181818');
        bAmGrad.addColorStop(1.0, '#4a4a4a');
        bctx.fillStyle = bAmGrad;
        bctx.fillRect(x0, y0, amW, rowH);

        ctx.fillStyle = 'rgba(8, 10, 12, 0.78)';
        ctx.fillRect(x0, y0 + rowH - 8, amW, 8);
        ctx.fillStyle = 'rgba(130, 142, 148, 0.28)';
        ctx.fillRect(x0, y0 + rowH - 11, amW, 3);

        bctx.fillStyle = '#0e0e0e';
        bctx.fillRect(x0, y0 + rowH - 8, amW, 8);
        bctx.fillStyle = '#888888';
        bctx.fillRect(x0, y0, amW, 5);
      }

      const sx0 = x0 + amW;
      ctx.fillStyle = 'rgba(6, 8, 10, 0.72)';
      ctx.fillRect(sx0 - 10, 0, 10, H);
      ctx.fillRect(sx0 + suW, 0, 10, H);

      for (let r = 0; r < rows; r++) {
        const y0 = r * rowH;
        const tone = (rand() - 0.5) * 12;
        const sr = Math.round(56 + tone);
        const sg = Math.round(63 + tone);
        const sb = Math.round(68 + tone);

        const suGrad = ctx.createLinearGradient(sx0, 0, sx0 + suW, 0);
        suGrad.addColorStop(0.0, `rgb(${sr - 26}, ${sg - 26}, ${sb - 26})`);
        suGrad.addColorStop(0.26, `rgb(${sr + 16}, ${sg + 18}, ${sb + 20})`);
        suGrad.addColorStop(0.48, `rgb(${sr + 34}, ${sg + 37}, ${sb + 40})`);
        suGrad.addColorStop(0.74, `rgb(${sr + 10}, ${sg + 12}, ${sb + 14})`);
        suGrad.addColorStop(1.0, `rgb(${sr - 28}, ${sg - 28}, ${sb - 28})`);
        ctx.fillStyle = suGrad;
        ctx.fillRect(sx0, y0, suW, rowH);

        const bSuGrad = bctx.createLinearGradient(sx0, 0, sx0 + suW, 0);
        bSuGrad.addColorStop(0.0, '#606060');
        bSuGrad.addColorStop(0.5, '#ffffff');
        bSuGrad.addColorStop(1.0, '#606060');
        bctx.fillStyle = bSuGrad;
        bctx.fillRect(sx0, y0, suW, rowH);

        ctx.fillStyle = 'rgba(10, 13, 16, 0.82)';
        ctx.fillRect(sx0, y0 + rowH - 8, suW, 8);
        ctx.fillStyle = 'rgba(185, 198, 204, 0.38)';
        ctx.fillRect(sx0 + 4, y0 + rowH - 12, suW - 8, 4);

        bctx.fillStyle = '#282828';
        bctx.fillRect(sx0, y0 + rowH - 7, suW, 7);
      }
    }

    for (let i = 0; i < 650; i++) {
      const mx = rand() * W;
      const my = rand() * H;
      const mr = 2 + rand() * 8;
      ctx.fillStyle =
        rand() > 0.45 ? 'rgba(92, 110, 82, 0.08)' : 'rgba(180, 186, 178, 0.05)';
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    const colorMap = new C_ENGINE.CanvasTexture(colorCanvas);
    colorMap.colorSpace = C_ENGINE.SRGBColorSpace;
    colorMap.wrapS = C_ENGINE.RepeatWrapping;
    colorMap.wrapT = C_ENGINE.RepeatWrapping;
    colorMap.anisotropy = 8;

    const bumpMap = new C_ENGINE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = C_ENGINE.RepeatWrapping;
    bumpMap.wrapT = C_ENGINE.RepeatWrapping;
    bumpMap.anisotropy = 8;

    return { colorMap, bumpMap };
  }

  static createRealisticMapleLeafTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.translate(128, 142);

    ctx.strokeStyle = '#8c3318';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(4, 48, 12, 92);
    ctx.stroke();

    const lobes = [
      { angle: -Math.PI * 0.82, len: 58, width: 15 },
      { angle: -Math.PI * 0.56, len: 92, width: 22 },
      { angle: -Math.PI * 0.28, len: 112, width: 25 },
      { angle: 0, len: 124, width: 27 },
      { angle: Math.PI * 0.28, len: 112, width: 25 },
      { angle: Math.PI * 0.56, len: 92, width: 22 },
      { angle: Math.PI * 0.82, len: 58, width: 15 }
    ];

    ctx.beginPath();
    ctx.moveTo(0, 12);

    lobes.forEach((lobe, idx) => {
      const a = lobe.angle - Math.PI / 2;
      const tipX = Math.cos(a) * lobe.len;
      const tipY = Math.sin(a) * lobe.len;

      const leftA = a - 0.16;
      const rightA = a + 0.16;
      const midLen = lobe.len * 0.64;

      const lx = Math.cos(leftA) * midLen;
      const ly = Math.sin(leftA) * midLen;
      const rx = Math.cos(rightA) * midLen;
      const ry = Math.sin(rightA) * midLen;

      ctx.quadraticCurveTo(lx * 0.75, ly * 0.75, lx, ly);
      ctx.quadraticCurveTo(
        Math.cos(a - 0.06) * (lobe.len * 0.88),
        Math.sin(a - 0.06) * (lobe.len * 0.88),
        tipX,
        tipY
      );
      ctx.quadraticCurveTo(
        Math.cos(a + 0.06) * (lobe.len * 0.88),
        Math.sin(a + 0.06) * (lobe.len * 0.88),
        rx,
        ry
      );

      if (idx < lobes.length - 1) {
        const nextA = lobes[idx + 1].angle - Math.PI / 2;
        const valleyA = (a + nextA) * 0.5;
        const valleyLen = Math.min(lobe.len, lobes[idx + 1].len) * 0.36;
        ctx.quadraticCurveTo(
          Math.cos(valleyA) * (valleyLen * 1.15),
          Math.sin(valleyA) * (valleyLen * 1.15),
          Math.cos(valleyA) * valleyLen,
          Math.sin(valleyA) * valleyLen
        );
      }
    });

    ctx.closePath();

    const leafGrad = ctx.createRadialGradient(0, -18, 8, 0, -24, 125);
    leafGrad.addColorStop(0.0, '#fff2b2');
    leafGrad.addColorStop(0.35, '#ffbe55');
    leafGrad.addColorStop(0.75, '#f26d35');
    leafGrad.addColorStop(1.0, '#b82514');
    ctx.fillStyle = leafGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(110, 22, 10, 0.55)';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 238, 175, 0.52)';
    ctx.lineWidth = 1.8;
    lobes.forEach((lobe) => {
      const a = lobe.angle - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(Math.cos(a) * (lobe.len * 0.88), Math.sin(a) * (lobe.len * 0.88));
      ctx.stroke();
    });

    ctx.restore();

    const tex = new C_ENGINE.CanvasTexture(canvas);
    tex.colorSpace = C_ENGINE.SRGBColorSpace;
    return tex;
  }

  /**
   * '무량수전.jpg' 실사 기반 고해상도 전면·측면·후면 건축 입면 PBR 텍스처 세트 생성
   * - 황토 포벽(ochreWall), 정자살 분합문/광창(latticeDoor), 흰색 한지 사분합 덧문(whiteShutter),
   *   하부 고목 궁판·머름(wainscot), 좌우·후면 전통 화방벽(hwabangWall)
   */
  static createMuryangFacadeTextures() {
    // 1. 황토 포벽 (무량수전 상부 황토 회벽 질감 + 처마 밑 자연 그늘)
    const ochreCanvas = document.createElement('canvas');
    ochreCanvas.width = 512;
    ochreCanvas.height = 256;
    const oCtx = ochreCanvas.getContext('2d');
    const oGrad = oCtx.createLinearGradient(0, 0, 0, 256);
    oGrad.addColorStop(0.0, '#9c681c');
    oGrad.addColorStop(0.22, '#c88928');
    oGrad.addColorStop(0.65, '#d99b32');
    oGrad.addColorStop(1.0, '#c28625');
    oCtx.fillStyle = oGrad;
    oCtx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 420; i++) {
      const x = (i * 97) % 512;
      const y = (i * 53) % 256;
      const r = 4 + (i % 7) * 3;
      oCtx.fillStyle = i % 2 === 0 ? 'rgba(255, 224, 158, 0.055)' : 'rgba(92, 54, 12, 0.06)';
      oCtx.beginPath();
      oCtx.arc(x, y, r, 0, Math.PI * 2);
      oCtx.fill();
    }
    const ochreWallTex = new C_ENGINE.CanvasTexture(ochreCanvas);
    ochreWallTex.wrapS = C_ENGINE.RepeatWrapping;
    ochreWallTex.wrapT = C_ENGINE.RepeatWrapping;
    ochreWallTex.colorSpace = C_ENGINE.SRGBColorSpace;

    // 2. 정자살 분합문 / 광창 (세밀한 목조 정자살 격자 + 한지 은은한 투광 + 하부 궁판 조각)
    const latCanvas = document.createElement('canvas');
    latCanvas.width = 512;
    latCanvas.height = 1024;
    const lCtx = latCanvas.getContext('2d');

    const latBumpCanvas = document.createElement('canvas');
    latBumpCanvas.width = 512;
    latBumpCanvas.height = 1024;
    const lbCtx = latBumpCanvas.getContext('2d');

    // 외곽 문얼굴 고목 틀
    lCtx.fillStyle = '#5e422b';
    lCtx.fillRect(0, 0, 512, 1024);
    lbCtx.fillStyle = '#d8d8d8';
    lbCtx.fillRect(0, 0, 512, 1024);

    // 상부 정자살 한지 창호 영역 (y: 28..736)
    const hanjiGrad = lCtx.createLinearGradient(30, 28, 482, 736);
    hanjiGrad.addColorStop(0, '#ded6c5');
    hanjiGrad.addColorStop(0.5, '#eae3d3');
    hanjiGrad.addColorStop(1, '#d3cab7');
    lCtx.fillStyle = hanjiGrad;
    lCtx.fillRect(30, 28, 452, 708);
    lbCtx.fillStyle = '#585858';
    lbCtx.fillRect(30, 28, 452, 708);

    // 정자살 세로·가로 살대 + 교차 꽃살 음영
    const cols = 10;
    const rows = 18;
    const cellW = 452 / cols;
    const cellH = 708 / rows;
    for (let c = 0; c <= cols; c++) {
      const sx = 30 + c * cellW;
      lCtx.fillStyle = 'rgba(34, 22, 14, 0.35)';
      lCtx.fillRect(sx - 3, 28, 10, 708);
      lCtx.fillStyle = '#6c4d33';
      lCtx.fillRect(sx - 3.5, 28, 7, 708);
      lbCtx.fillStyle = '#c8c8c8';
      lbCtx.fillRect(sx - 3.5, 28, 7, 708);
    }
    for (let r = 0; r <= rows; r++) {
      const sy = 28 + r * cellH;
      lCtx.fillStyle = 'rgba(34, 22, 14, 0.32)';
      lCtx.fillRect(30, sy - 2, 452, 9);
      lCtx.fillStyle = '#735338';
      lCtx.fillRect(30, sy - 3, 452, 6.5);
      lbCtx.fillStyle = '#cfcfcf';
      lbCtx.fillRect(30, sy - 3, 452, 6.5);
    }
    // 대각선 정자(井字) 빗살 보조문양
    lCtx.strokeStyle = 'rgba(105, 74, 48, 0.55)';
    lCtx.lineWidth = 2.6;
    for (let r = 0; r < rows; r += 2) {
      for (let c = 0; c < cols; c += 2) {
        const x0 = 30 + c * cellW;
        const y0 = 28 + r * cellH;
        lCtx.beginPath();
        lCtx.moveTo(x0, y0);
        lCtx.lineTo(x0 + cellW * 2, y0 + cellH * 2);
        lCtx.moveTo(x0 + cellW * 2, y0);
        lCtx.lineTo(x0, y0 + cellH * 2);
        lCtx.stroke();
      }
    }

    // 중간 띠장 및 하부 궁판(청판 + 안상 조각)
    lCtx.fillStyle = '#533924';
    lCtx.fillRect(18, 736, 476, 36);
    lCtx.fillStyle = '#6b4c32';
    lCtx.fillRect(34, 776, 444, 214);
    lCtx.strokeStyle = '#3d2818';
    lCtx.lineWidth = 6;
    lCtx.strokeRect(46, 788, 420, 190);
    // 안상(眼象) 문양 테두리
    lCtx.strokeStyle = 'rgba(205, 168, 124, 0.42)';
    lCtx.lineWidth = 4;
    lCtx.strokeRect(72, 812, 368, 142);

    lbCtx.fillStyle = '#e0e0e0';
    lbCtx.fillRect(18, 736, 476, 36);
    lbCtx.fillStyle = '#8c8c8c';
    lbCtx.fillRect(46, 788, 420, 190);

    // 전통 철제 문고리
    lCtx.fillStyle = '#2a221c';
    lCtx.beginPath();
    lCtx.arc(446, 560, 13, 0, Math.PI * 2);
    lCtx.fill();
    lCtx.strokeStyle = '#3a3028';
    lCtx.lineWidth = 4;
    lCtx.beginPath();
    lCtx.arc(446, 578, 14, 0, Math.PI * 2);
    lCtx.stroke();

    const latticeDoorTex = new C_ENGINE.CanvasTexture(latCanvas);
    latticeDoorTex.colorSpace = C_ENGINE.SRGBColorSpace;
    const latticeDoorBump = new C_ENGINE.CanvasTexture(latBumpCanvas);

    // 3. 흰색 사분합 한지 덧문 ('무량수전.jpg'의 열린 흰색 덧문 실사 질감)
    const shutCanvas = document.createElement('canvas');
    shutCanvas.width = 512;
    shutCanvas.height = 1024;
    const sCtx = shutCanvas.getContext('2d');
    const sGrad = sCtx.createLinearGradient(0, 0, 512, 1024);
    sGrad.addColorStop(0.0, '#f7f4ec');
    sGrad.addColorStop(0.5, '#f2eee4');
    sGrad.addColorStop(1.0, '#e6e0d2');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 512, 1024);

    // 한지 결 및 은은한 배접 단차선
    for (let y = 0; y < 1024; y += 6) {
      sCtx.fillStyle = y % 12 === 0 ? 'rgba(195, 184, 165, 0.14)' : 'rgba(255, 255, 255, 0.18)';
      sCtx.fillRect(14, y, 484, 2);
    }
    for (const bandY of [256, 512, 768]) {
      sCtx.fillStyle = 'rgba(168, 158, 140, 0.28)';
      sCtx.fillRect(16, bandY - 3, 480, 6);
    }
    // 덧문 나무 테두리 및 무쇠 경첩(돌쩌귀)
    sCtx.strokeStyle = '#cbbba2';
    sCtx.lineWidth = 18;
    sCtx.strokeRect(9, 9, 494, 1006);
    sCtx.strokeStyle = 'rgba(90, 72, 52, 0.36)';
    sCtx.lineWidth = 3;
    sCtx.strokeRect(18, 18, 476, 988);

    sCtx.fillStyle = '#332c27';
    for (const hy of [165, 512, 860]) {
      sCtx.fillRect(0, hy - 8, 42, 16);
      sCtx.beginPath();
      sCtx.arc(42, hy, 7, 0, Math.PI * 2);
      sCtx.fill();
    }

    const whiteShutterTex = new C_ENGINE.CanvasTexture(shutCanvas);
    whiteShutterTex.colorSpace = C_ENGINE.SRGBColorSpace;

    // 4. 하부 고목 머름 · 궁판 판벽 텍스처
    const wainCanvas = document.createElement('canvas');
    wainCanvas.width = 1024;
    wainCanvas.height = 256;
    const wCtx = wainCanvas.getContext('2d');
    wCtx.fillStyle = '#60442d';
    wCtx.fillRect(0, 0, 1024, 256);
    for (let y = 0; y < 256; y += 4) {
      wCtx.fillStyle = y % 8 === 0 ? 'rgba(30, 18, 10, 0.18)' : 'rgba(168, 126, 86, 0.08)';
      wCtx.fillRect(0, y, 1024, 2);
    }
    const panelCount = 4;
    const pW = 1024 / panelCount;
    for (let i = 0; i < panelCount; i++) {
      const px = i * pW;
      wCtx.strokeStyle = '#3b2718';
      wCtx.lineWidth = 10;
      wCtx.strokeRect(px + 18, 22, pW - 36, 212);
      wCtx.fillStyle = '#715137';
      wCtx.fillRect(px + 28, 32, pW - 56, 192);
      wCtx.strokeStyle = 'rgba(212, 174, 132, 0.28)';
      wCtx.lineWidth = 3;
      wCtx.strokeRect(px + 42, 46, pW - 84, 164);
    }
    const wainscotTex = new C_ENGINE.CanvasTexture(wainCanvas);
    wainscotTex.wrapS = C_ENGINE.RepeatWrapping;
    wainscotTex.wrapT = C_ENGINE.RepeatWrapping;
    wainscotTex.colorSpace = C_ENGINE.SRGBColorSpace;

    // 5. 좌우·후면 전통 화방벽(花防壁: 화강석 지대 + 전돌·기와편 줄눈 + 회벽) 텍스처
    const hwCanvas = document.createElement('canvas');
    hwCanvas.width = 512;
    hwCanvas.height = 512;
    const hCtx = hwCanvas.getContext('2d');
    hCtx.fillStyle = '#cfc7b6';
    hCtx.fillRect(0, 0, 512, 512);

    const rowH = 42;
    for (let ry = 0, row = 0; ry < 512; ry += rowH, row++) {
      const isDarkCourse = row % 2 === 0;
      hCtx.fillStyle = isDarkCourse ? '#52565a' : '#bab2a2';
      hCtx.fillRect(0, ry + 3, 512, rowH - 6);
      // 회줄눈
      hCtx.fillStyle = '#ddd6c7';
      hCtx.fillRect(0, ry, 512, 4);
      const brickW = 96;
      const offset = (row % 2) * (brickW * 0.5);
      for (let bx = -offset; bx < 512; bx += brickW) {
        hCtx.fillStyle = '#d9d2c3';
        hCtx.fillRect(bx, ry, 4, rowH);
        hCtx.fillStyle =
          (Math.round(bx + ry) % 3 === 0)
            ? 'rgba(0, 0, 0, 0.08)'
            : 'rgba(255, 255, 255, 0.06)';
        hCtx.fillRect(bx + 6, ry + 5, brickW - 10, rowH - 10);
      }
    }
    const hwabangWallTex = new C_ENGINE.CanvasTexture(hwCanvas);
    hwabangWallTex.wrapS = C_ENGINE.RepeatWrapping;
    hwabangWallTex.wrapT = C_ENGINE.RepeatWrapping;
    hwabangWallTex.repeat.set(3, 1.4);
    hwabangWallTex.colorSpace = C_ENGINE.SRGBColorSpace;

    return {
      ochreWallTex,
      latticeDoorTex,
      latticeDoorBump,
      whiteShutterTex,
      wainscotTex,
      hwabangWallTex
    };
  }
}
