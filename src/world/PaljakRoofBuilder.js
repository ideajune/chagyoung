/**
 * PaljakRoofBuilder — 무량수전·안양루 실사 기반 3D 한국 전통 팔작지붕(현수선 주 지붕면, 측면 추녀 날개면, 합각벽, 용마루·내림마루·추녀마루, 수키와·수막새) 빌더
 */

const C_ENGINE = window.SANSA_CORE;

export function buildRealisticPaljakRoof(parent, spec, materials) {
  const {
    style = 'muryangsujeon', // 'muryangsujeon' | 'anyangru'
    width = 36.8,
    depth = 13.6,
    baseY = 5.88,
    ridgeHeight = 4.95,
    ridgeLength = 22.4,
    tileRepeatX = 32,
    tileRepeatZ = 9,
    ridgeCurveLift = style === 'anyangru' ? 0.36 : 0.28,
    cornerLiftRatio = style === 'anyangru' ? 0.28 : 0.24,
    gableSplit = style === 'anyangru' ? 0.45 : 0.43
  } = spec;

  const rg = new C_ENGINE.Group();
  rg.position.set(spec.x || 0, baseY, spec.z || 0);

  // 지붕 마루 양성 바름, 수막새, 수키와 골, 합각벽 전용 재질
  const matYangseong = new C_ENGINE.MeshStandardMaterial({
    color: 0x868a8e,
    roughness: 0.88,
    metalness: 0.02
  });
  const matSumaksae = new C_ENGINE.MeshStandardMaterial({
    color: 0x4e5459,
    roughness: 0.84,
    metalness: 0.05
  });
  const matSugiwaRib = new C_ENGINE.MeshStandardMaterial({
    color: 0x3b4146,
    roughness: 0.76,
    metalness: 0.06
  });
  const matGableBoard = new C_ENGINE.MeshStandardMaterial({
    color: 0x2c1e15,
    roughness: 0.90,
    metalness: 0.02,
    side: C_ENGINE.DoubleSide
  });

  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const halfRidge = ridgeLength * 0.5;
  const gableBaseX = halfRidge + (halfW - halfRidge) * 0.12;
  const gableBaseZ = halfD * gableSplit;

  // 정규화된 깊이 s (0 = 용마루, 1 = 처마 끝) 및 x 위치에서의 주 지붕면 높이 계산
  const getMainSlopeY = (x, s) => {
    const uRidge = Math.min(1.4, Math.abs(x) / Math.max(0.1, halfRidge));
    const topY = ridgeHeight + Math.pow(uRidge, 2.0) * ridgeCurveLift * (1 - s * 0.65);
    const catenaryDrop = Math.pow(s, 0.76) * ridgeHeight;
    const uEave = Math.min(1.2, Math.abs(x) / Math.max(0.1, halfW));
    const cornerLift = Math.pow(uEave, 2.6) * Math.pow(s, 1.35) * (ridgeHeight * cornerLiftRatio);
    return topY - catenaryDrop + cornerLift;
  };

  const gableCornerY = getMainSlopeY(gableBaseX, gableSplit);

  // 1. 전·후면 현수선 주 지붕면 (안허리곡 + 귀솟음)
  const segU = 56;
  const segS = 24;
  const fbVerts = [];
  const fbUvs = [];
  const fbIndices = [];

  for (const zSign of [-1, 1]) {
    const baseVertexOffset = fbVerts.length / 3;
    for (let is = 0; is <= segS; is++) {
      const s = is / segS;
      let spanHalfX;
      if (s <= gableSplit) {
        const tGable = s / gableSplit;
        spanHalfX = halfRidge + (gableBaseX - halfRidge) * Math.pow(tGable, 1.15);
      } else {
        const tHip = (s - gableSplit) / (1 - gableSplit);
        const eaveFlare = 1 + Math.pow(tHip, 1.8) * 0.045;
        spanHalfX = (gableBaseX + (halfW - gableBaseX) * tHip) * eaveFlare;
      }

      const zBase = zSign * s * halfD;

      for (let iu = 0; iu <= segU; iu++) {
        const u = (iu / segU) * 2 - 1;
        const absU = Math.abs(u);
        const x = u * spanHalfX;
        const anheori = Math.pow(absU, 2.2) * Math.pow(s, 1.6) * (halfD * 0.065);
        const z = zBase + zSign * anheori;
        const y = getMainSlopeY(x, s);

        fbVerts.push(x, y, z);
        const tileU = (x / width + 0.5) * tileRepeatX;
        const tileV = (1 - s) * tileRepeatZ;
        fbUvs.push(tileU, tileV);
      }
    }

    for (let is = 0; is < segS; is++) {
      for (let iu = 0; iu < segU; iu++) {
        const a = baseVertexOffset + is * (segU + 1) + iu;
        const b = a + segU + 1;
        if (zSign > 0) {
          fbIndices.push(a, b, a + 1, a + 1, b, b + 1);
        } else {
          fbIndices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
  }

  const fbGeo = new C_ENGINE.BufferGeometry();
  fbGeo.setAttribute('position', new C_ENGINE.Float32BufferAttribute(fbVerts, 3));
  fbGeo.setAttribute('uv', new C_ENGINE.Float32BufferAttribute(fbUvs, 2));
  fbGeo.setIndex(fbIndices);
  fbGeo.computeVertexNormals();

  materials.createMesh(fbGeo, materials.matRealisticGiwa, rg, {
    preserveUvs: true,
    tone: 0.98
  });

  const fbSoffit = fbGeo.clone();
  fbSoffit.translate(0, -0.14, 0);
  materials.matDarkTimber.side = C_ENGINE.DoubleSide;
  materials.createMesh(fbSoffit, materials.matDarkTimber, rg, {
    preserveUvs: true,
    castShadow: false,
    tone: 0.82
  });

  // 2. 좌·우 측면 팔작 추녀 날개 지붕면
  const sideSegT = 18;
  const sideSegW = 28;
  const sideVerts = [];
  const sideUvs = [];
  const sideIndices = [];

  for (const sideSign of [-1, 1]) {
    const baseVertexOffset = sideVerts.length / 3;
    for (let it = 0; it <= sideSegT; it++) {
      const t = it / sideSegT;
      const sEquiv = gableSplit + t * (1 - gableSplit);
      const eaveFlare = 1 + Math.pow(t, 1.8) * 0.045;
      const x = sideSign * (gableBaseX + (halfW - gableBaseX) * t) * eaveFlare;
      const maxZAtT = halfD * sEquiv + Math.pow(t, 1.6) * (halfD * 0.065);

      for (let iw = 0; iw <= sideSegW; iw++) {
        const w = (iw / sideSegW) * 2 - 1;
        const absW = Math.abs(w);
        const z = w * maxZAtT;
        const baseWingY = getMainSlopeY(Math.abs(x), sEquiv);
        const centerDip = (1 - absW * absW) * t * 0.14;
        const y = baseWingY - centerDip;

        sideVerts.push(x, y, z);
        const tileU = (z / depth + 0.5) * Math.round(tileRepeatZ * 1.45);
        const tileV = (1 - t) * (tileRepeatZ * (1 - gableSplit));
        sideUvs.push(tileU, tileV);
      }
    }

    for (let it = 0; it < sideSegT; it++) {
      for (let iw = 0; iw < sideSegW; iw++) {
        const a = baseVertexOffset + it * (sideSegW + 1) + iw;
        const b = a + sideSegW + 1;
        if (sideSign > 0) {
          sideIndices.push(a, a + 1, b, a + 1, b + 1, b);
        } else {
          sideIndices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    }
  }

  const sideGeo = new C_ENGINE.BufferGeometry();
  sideGeo.setAttribute('position', new C_ENGINE.Float32BufferAttribute(sideVerts, 3));
  sideGeo.setAttribute('uv', new C_ENGINE.Float32BufferAttribute(sideUvs, 2));
  sideGeo.setIndex(sideIndices);
  sideGeo.computeVertexNormals();

  materials.createMesh(sideGeo, materials.matRealisticGiwa, rg, {
    preserveUvs: true,
    tone: 0.96
  });

  const sideSoffit = sideGeo.clone();
  sideSoffit.translate(0, -0.14, 0);
  materials.createMesh(sideSoffit, materials.matDarkTimber, rg, {
    preserveUvs: true,
    castShadow: false,
    tone: 0.82
  });

  // 3. 용마루(적새 + 양성 바름 + 망와/취두)
  const yongPts = [];
  const yangPts = [];
  const yongSegs = 28;
  for (let i = 0; i <= yongSegs; i++) {
    const u = (i / yongSegs) * 2 - 1;
    const rx = u * (halfRidge + 0.22);
    const ry = getMainSlopeY(rx, 0);
    yongPts.push(new C_ENGINE.Vector3(rx, ry + 0.24, 0));
    yangPts.push(new C_ENGINE.Vector3(rx, ry + 0.07, 0));
  }
  const yongCurve = new C_ENGINE.CatmullRomCurve3(yongPts);
  const yangCurve = new C_ENGINE.CatmullRomCurve3(yangPts);

  materials.createMesh(
    new C_ENGINE.TubeGeometry(yongCurve, 32, 0.24, 8, false),
    materials.matRealisticGiwa,
    rg,
    { preserveUvs: true, scale: [1, 1.15, 0.92], tone: 1.06 }
  );
  materials.createMesh(
    new C_ENGINE.TubeGeometry(yangCurve, 32, 0.14, 8, false),
    matYangseong,
    rg,
    { scale: [1, 0.72, 1.35] }
  );

  for (const sideSign of [-1, 1]) {
    const endX = sideSign * (halfRidge + 0.26);
    const endY = getMainSlopeY(endX, 0);
    materials.createMesh(
      new C_ENGINE.RoundedBoxGeometry(0.46, 0.76, 0.56, 2, 0.07),
      materials.matRealisticGiwa,
      rg,
      {
        pos: [endX, endY + 0.38, 0],
        rot: [0, 0, -sideSign * 0.14],
        preserveUvs: true,
        tone: 1.08
      }
    );
    materials.createMesh(
      new C_ENGINE.CylinderGeometry(0.18, 0.18, 0.50, 16),
      matSumaksae,
      rg,
      {
        pos: [endX + sideSign * 0.06, endY + 0.44, 0],
        rot: [0, 0, Math.PI * 0.5 - sideSign * 0.14]
      }
    );
  }

  // 4. 삼각 합각벽 · 박공널 · 내림마루 · 추녀마루 · 사래
  for (const sideSign of [-1, 1]) {
    const topX = sideSign * halfRidge;
    const topY = getMainSlopeY(topX, 0);
    const botX = sideSign * gableBaseX;
    const botY = gableCornerY;

    const insetX = sideSign * (halfRidge - 0.18);
    const gableVerts = new Float32Array([
      insetX, topY - 0.05, 0,
      botX - sideSign * 0.15, botY - 0.05, gableBaseZ,
      botX - sideSign * 0.15, botY - 0.05, -gableBaseZ
    ]);
    const gableGeo = new C_ENGINE.BufferGeometry();
    gableGeo.setAttribute('position', new C_ENGINE.BufferAttribute(gableVerts, 3));
    gableGeo.setIndex(sideSign > 0 ? [0, 2, 1] : [0, 1, 2]);
    gableGeo.computeVertexNormals();
    materials.createMesh(
      gableGeo,
      style === 'anyangru' ? matGableBoard : materials.matPlaster,
      rg,
      { castShadow: false, tone: style === 'anyangru' ? 0.95 : 0.90 }
    );

    const battenSteps = 7;
    for (let b = -battenSteps; b <= battenSteps; b++) {
      const frac = Math.abs(b) / (battenSteps + 1);
      const bz = (b / (battenSteps + 1)) * gableBaseZ;
      const bh = Math.max(0.18, (topY - botY) * (1 - frac));
      const bx = insetX + (botX - sideSign * 0.12 - insetX) * frac;
      materials.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.08, bh, 0.09, 2, 0.01),
        materials.matDarkTimber,
        rg,
        { pos: [bx, botY + bh * 0.5 - 0.04, bz], tone: 0.85 }
      );
    }

    materials.createMesh(
      new C_ENGINE.RoundedBoxGeometry(0.24, 0.22, gableBaseZ * 2.02, 2, 0.02),
      materials.matDarkTimber,
      rg,
      { pos: [botX - sideSign * 0.12, botY - 0.02, 0], tone: 0.88 }
    );

    for (const zSign of [-1, 1]) {
      const bargePts = [];
      const naerimPts = [];
      const naerimYangPts = [];
      for (let k = 0; k <= 10; k++) {
        const kt = k / 10;
        const s = kt * gableSplit;
        const nx = sideSign * (halfRidge + (gableBaseX - halfRidge) * Math.pow(kt, 1.15));
        const nz = zSign * s * halfD;
        const ny = getMainSlopeY(nx, s);
        bargePts.push(new C_ENGINE.Vector3(nx - sideSign * 0.06, ny - 0.12, nz));
        naerimPts.push(new C_ENGINE.Vector3(nx, ny + 0.19, nz));
        naerimYangPts.push(new C_ENGINE.Vector3(nx, ny + 0.06, nz));
      }

      const bargeCurve = new C_ENGINE.CatmullRomCurve3(bargePts);
      materials.createMesh(
        new C_ENGINE.TubeGeometry(bargeCurve, 12, 0.13, 6, false),
        materials.matTimber,
        rg,
        { scale: [0.65, 1.35, 1.0], tone: 0.92 }
      );

      const naerimCurve = new C_ENGINE.CatmullRomCurve3(naerimPts);
      const naerimYangCurve = new C_ENGINE.CatmullRomCurve3(naerimYangPts);
      materials.createMesh(
        new C_ENGINE.TubeGeometry(naerimCurve, 16, 0.20, 8, false),
        materials.matRealisticGiwa,
        rg,
        { preserveUvs: true, tone: 1.05 }
      );
      materials.createMesh(
        new C_ENGINE.TubeGeometry(naerimYangCurve, 16, 0.12, 6, false),
        matYangseong,
        rg,
        { scale: [1.1, 0.7, 1.1] }
      );

      const nEnd = naerimPts[naerimPts.length - 1];
      materials.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.38, 0.44, 0.42, 2, 0.05),
        materials.matRealisticGiwa,
        rg,
        {
          pos: [nEnd.x + sideSign * 0.08, nEnd.y + 0.08, nEnd.z + zSign * 0.10],
          rot: [zSign * 0.22, 0, -sideSign * 0.18],
          preserveUvs: true,
          tone: 1.08
        }
      );
      materials.createMesh(
        new C_ENGINE.CylinderGeometry(0.14, 0.14, 0.10, 14),
        matSumaksae,
        rg,
        {
          pos: [nEnd.x + sideSign * 0.14, nEnd.y + 0.12, nEnd.z + zSign * 0.30],
          rot: [Math.PI * 0.5, 0, -sideSign * 0.35]
        }
      );

      const chunyeoPts = [];
      const chunyeoYangPts = [];
      for (let k = 0; k <= 14; k++) {
        const kt = k / 14;
        const s = gableSplit + kt * (1 - gableSplit);
        const eaveFlare = 1 + Math.pow(kt, 1.8) * 0.048;
        const cx = sideSign * (gableBaseX + (halfW - gableBaseX) * kt) * eaveFlare;
        const cz = zSign * (s * halfD + Math.pow(kt, 1.6) * (halfD * 0.065));
        const cy = getMainSlopeY(cx, s);
        chunyeoPts.push(new C_ENGINE.Vector3(cx, cy + 0.18, cz));
        chunyeoYangPts.push(new C_ENGINE.Vector3(cx, cy + 0.05, cz));
      }

      const chunyeoCurve = new C_ENGINE.CatmullRomCurve3(chunyeoPts);
      const chunyeoYangCurve = new C_ENGINE.CatmullRomCurve3(chunyeoYangPts);
      materials.createMesh(
        new C_ENGINE.TubeGeometry(chunyeoCurve, 20, 0.19, 8, false),
        materials.matRealisticGiwa,
        rg,
        { preserveUvs: true, tone: 1.05 }
      );
      materials.createMesh(
        new C_ENGINE.TubeGeometry(chunyeoYangCurve, 20, 0.11, 6, false),
        matYangseong,
        rg,
        { scale: [1.1, 0.7, 1.1] }
      );

      const cTip = chunyeoPts[chunyeoPts.length - 1];
      const yawCorner = Math.atan2(sideSign * (halfW - gableBaseX), zSign * halfD * (1 - gableSplit));
      materials.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.34, 0.42, 0.46, 2, 0.05),
        materials.matRealisticGiwa,
        rg,
        {
          pos: [cTip.x + sideSign * 0.08, cTip.y + 0.06, cTip.z + zSign * 0.08],
          rot: [-0.22, yawCorner, 0],
          preserveUvs: true,
          tone: 1.08
        }
      );
      materials.createMesh(
        new C_ENGINE.RoundedBoxGeometry(0.24, 0.24, 0.75, 2, 0.03),
        materials.matTimber,
        rg,
        {
          pos: [cTip.x + sideSign * 0.12, cTip.y - 0.30, cTip.z + zSign * 0.12],
          rot: [-0.18, yawCorner, 0],
          tone: 0.96
        }
      );
    }
  }

  // 5. 입체 세로 수키와 줄기 및 처마 끝 원형 수막새
  const frontSumaksaeCount = Math.min(46, Math.max(28, Math.round(width * 1.15)));
  for (const zSign of [-1, 1]) {
    for (let i = 0; i < frontSumaksaeCount; i++) {
      const u = (i / (frontSumaksaeCount - 1)) * 2 - 1;
      const absU = Math.abs(u);
      const sx = u * halfW * 1.045;
      const absX = Math.abs(sx);

      let s0 = 0.02;
      if (absX > halfRidge && absX <= gableBaseX) {
        const frac = (absX - halfRidge) / Math.max(0.05, gableBaseX - halfRidge);
        s0 = Math.min(0.92, Math.pow(frac, 1 / 1.15) * gableSplit + 0.02);
      } else if (absX > gableBaseX) {
        const frac = (absX - gableBaseX) / Math.max(0.05, halfW * 1.045 - gableBaseX);
        s0 = Math.min(0.94, gableSplit + frac * (1 - gableSplit) + 0.02);
      }

      if (s0 < 0.94) {
        const ribPts = [];
        const ribSteps = 7;
        for (let rs = 0; rs <= ribSteps; rs++) {
          const sCur = s0 + (rs / ribSteps) * (1.0 - s0);
          const anheoriCur = Math.pow(absU, 2.2) * Math.pow(sCur, 1.6) * (halfD * 0.065);
          const rz = zSign * (sCur * halfD + anheoriCur);
          const ry = getMainSlopeY(sx, sCur) + 0.055;
          ribPts.push(new C_ENGINE.Vector3(sx, ry, rz));
        }
        const ribCurve = new C_ENGINE.CatmullRomCurve3(ribPts);
        materials.createMesh(
          new C_ENGINE.TubeGeometry(ribCurve, 7, 0.115, 6, false),
          matSugiwaRib,
          rg,
          { castShadow: false, scale: [1.05, 0.88, 1.0] }
        );
      }

      const anheori = Math.pow(absU, 2.2) * (halfD * 0.065);
      const sz = zSign * (halfD + anheori);
      const sy = getMainSlopeY(sx, 1.0) + 0.035;

      materials.createMesh(
        new C_ENGINE.CylinderGeometry(0.115, 0.115, 0.06, 12),
        matSumaksae,
        rg,
        {
          pos: [sx, sy - 0.01, sz + zSign * 0.03],
          rot: [Math.PI * 0.5 - zSign * 0.24, 0, 0],
          castShadow: false
        }
      );
    }
  }

  // 좌·우 측면 추녀 지붕면 수키와 줄기 및 수막새
  const sideSumaksaeCount = Math.min(18, Math.max(12, Math.round(depth * 1.25)));
  for (const sideSign of [-1, 1]) {
    const sx = sideSign * halfW * 1.045;
    const maxZ = halfD * 1.065;
    for (let i = 1; i < sideSumaksaeCount - 1; i++) {
      const w = (i / (sideSumaksaeCount - 1)) * 2 - 1;
      const absW = Math.abs(w);
      const sz = w * maxZ;

      const t0 = Math.min(
        0.90,
        Math.max(0.04, (absW * maxZ - gableBaseZ) / Math.max(0.1, maxZ - gableBaseZ))
      );
      const sideRibPts = [];
      const sideRibSteps = 5;
      for (let rs = 0; rs <= sideRibSteps; rs++) {
        const tCur = t0 + (rs / sideRibSteps) * (1.0 - t0);
        const sEquiv = gableSplit + tCur * (1 - gableSplit);
        const eaveFlare = 1 + Math.pow(tCur, 1.8) * 0.045;
        const rx = sideSign * (gableBaseX + (halfW - gableBaseX) * tCur) * eaveFlare;
        const centerDip = (1 - absW * absW) * tCur * 0.14;
        const ry = getMainSlopeY(Math.abs(rx), sEquiv) - centerDip + 0.055;
        sideRibPts.push(new C_ENGINE.Vector3(rx, ry, sz));
      }
      const sideRibCurve = new C_ENGINE.CatmullRomCurve3(sideRibPts);
      materials.createMesh(
        new C_ENGINE.TubeGeometry(sideRibCurve, 5, 0.11, 6, false),
        matSugiwaRib,
        rg,
        { castShadow: false, scale: [1.0, 0.88, 1.05] }
      );

      const centerDip = (1 - w * w) * 0.14;
      const sy = getMainSlopeY(Math.abs(sx), 1.0) - centerDip + 0.035;

      materials.createMesh(
        new C_ENGINE.CylinderGeometry(0.11, 0.11, 0.06, 12),
        matSumaksae,
        rg,
        {
          pos: [sx + sideSign * 0.03, sy - 0.01, sz],
          rot: [0, 0, Math.PI * 0.5 - sideSign * 0.24],
          castShadow: false
        }
      );
    }
  }

  parent.add(rg);
  return rg;
}
