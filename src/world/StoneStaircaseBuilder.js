/**
 * StoneStaircaseBuilder — 전통 사찰 화강암 돌계단(통돌 디딤석 + 지대석 + 사다리꼴 귀틀 소매돌) 공용 빌더
 */

import { SANSA_CORE as C_ENGINE } from '../engine/CoreRuntime.js';

export function buildTraditionalStoneStaircase(parent, opts, materials) {
    const m = materials;
    const {
      x = 0,
      bottomY = -0.82,
      topY = 0.20,
      startZ = 3.60,
      endZ = 5.58,
      treadWidth = 4.0,
      cheekWidth = 0.34,
      stepCount = 5
    } = opts;

    const rise = Math.max(0.3, topY - bottomY);
    const run = Math.max(0.8, Math.abs(endZ - startZ));
    const dirZ = endZ >= startZ ? 1 : -1;

    const sg = new C_ENGINE.Group();
    sg.position.set(x, bottomY, startZ);
    // local +Z가 항상 계단 하단(0)에서 기단 상단(run)을 향하도록 정렬
    if (dirZ < 0) {
      sg.rotation.y = Math.PI;
    }

    // 1. 계단 하부 자연 접지 그림자 및 수평 화강암 지대석(기초석)
    const cs = new C_ENGINE.Mesh(
      new C_ENGINE.PlaneGeometry(treadWidth + cheekWidth * 2 + 1.1, run + 0.9),
      m.matContactShadow
    );
    cs.rotation.x = -Math.PI / 2;
    cs.position.set(0, 0.015, run * 0.46);
    sg.add(cs);

    const totalOuterW = treadWidth + cheekWidth * 2;
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(totalOuterW + 0.14, 0.10, run + 0.24, 2, 0.025),
      m.matStone,
      sg,
      { pos: [0, 0.035, run * 0.5 - 0.02], tone: 0.88 }
    );
    // 계단 앞 디딤 박석
    m.createMesh(
      new C_ENGINE.RoundedBoxGeometry(treadWidth * 0.86, 0.055, 0.40, 2, 0.02),
      m.matStone,
      sg,
      { pos: [0, 0.02, -0.24], tone: 0.94 }
    );

    // 2. 속이 꽉 찬 통돌 화강암 계단석 (아랫면 빈 구멍 없이 바닥 지대석부터 기단 안쪽까지 일체 결구)
    const stepDepth = run / stepCount;
    for (let s = 0; s < stepCount; s++) {
      const stepTopY = ((s + 1) / (stepCount + 0.18)) * rise;
      const frontZ = s * stepDepth;
      const solidDepth = run + 0.10 - frontZ;
      const solidH = Math.max(0.10, stepTopY - 0.04);

      // 하부 통돌 몸체 (챌면 및 측면 하부 빈틈 완전 차단)
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(treadWidth + 0.02, solidH, solidDepth, 2, 0.02),
        m.matStone,
        sg,
        {
          pos: [0, 0.04 + solidH * 0.5, frontZ + solidDepth * 0.5],
          tone: 0.91 + (s % 2) * 0.025
        }
      );

      // 상단 장대석 디딤판 (살짝 내민 물끊기 코 몰딩)
      const capDepth = Math.min(solidDepth + 0.03, stepDepth + 0.12);
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(treadWidth + 0.03, 0.072, capDepth, 2, 0.022),
        m.matStone,
        sg,
        {
          pos: [0, stepTopY - 0.028, frontZ - 0.02 + capDepth * 0.5],
          tone: 0.96 + (s % 3) * 0.02
        }
      );
    }

    // 3. 좌·우 전통 삼각·사다리꼴 귀틀 소매돌 (수평 바닥 + 수직 뒷면 + 윗어깨단 + 완만한 빗면 + 앞코 북석)
    const shoulderLen = Math.min(0.32, run * 0.17);
    const topCrestY = rise + 0.095;
    const noseTopY = Math.max(0.21, rise * 0.23);

    const cheekShape = new C_ENGINE.Shape();
    cheekShape.moveTo(-0.06, 0.02); // 앞쪽 바닥 모서리 (수평 지대석 밀착)
    cheekShape.lineTo(run + 0.10, 0.02); // 기단 안쪽 바닥 모서리 (수평)
    cheekShape.lineTo(run + 0.10, topCrestY); // 기단 맞물림 수직 뒷면
    cheekShape.lineTo(run - shoulderLen, topCrestY); // 기단 갑석에서 이어지는 수평 윗어깨단
    // 부드러운 곡선으로 꺾여 내려오는 전통 화강암 소매돌 빗면
    cheekShape.quadraticCurveTo(
      run - shoulderLen - 0.12,
      topCrestY - 0.01,
      run * 0.45,
      noseTopY + (topCrestY - noseTopY) * 0.46
    );
    cheekShape.quadraticCurveTo(0.22, noseTopY + 0.03, 0.04, noseTopY);
    // 앞코(북석) 둥근 이마와 수직 앞면
    cheekShape.quadraticCurveTo(-0.06, noseTopY - 0.005, -0.06, noseTopY - 0.07);
    cheekShape.lineTo(-0.06, 0.02);

    const extrudeDepth = Math.max(0.16, cheekWidth - 0.044);
    const baseCheekGeo = new C_ENGINE.ExtrudeGeometry(cheekShape, {
      depth: extrudeDepth,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.020,
      bevelSegments: 3,
      curveSegments: 10
    });
    // X축 두께 중심 정렬 후 +X(shape) -> +Z(local), +Y(shape) -> +Y(local) 회전
    baseCheekGeo.translate(0, 0, -extrudeDepth * 0.5);
    baseCheekGeo.rotateY(-Math.PI * 0.5);
    baseCheekGeo.computeVertexNormals();

    // 소매돌 하단 고임 귀틀석 및 본체 좌·우 대칭 배치
    const cheekCenterX = treadWidth * 0.5 + cheekWidth * 0.5 - 0.01;
    for (const sideSign of [-1, 1]) {
      const cx = sideSign * cheekCenterX;
      m.createMesh(baseCheekGeo.clone(), m.matStone, sg, {
        pos: [cx, 0, 0],
        tone: 0.92 + (sideSign > 0 ? 0.015 : 0)
      });

      // 소매돌 바깥쪽 하단 자연 풍화 지대 받침돌 디테일
      m.createMesh(
        new C_ENGINE.RoundedBoxGeometry(cheekWidth + 0.05, 0.12, run + 0.22, 2, 0.025),
        m.matStone,
        sg,
        { pos: [cx, 0.055, run * 0.5 + 0.01], tone: 0.85 }
      );
    }

    parent.add(sg);
}
