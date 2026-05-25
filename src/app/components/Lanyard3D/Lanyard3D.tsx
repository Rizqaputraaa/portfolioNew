/* eslint-disable react/no-unknown-property */
'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { Object3DNode, MaterialNode } from '@react-three/fiber';
import styles from './Lanyard3D.module.css';

extend({ MeshLineGeometry, MeshLineMaterial });

declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: Object3DNode<MeshLineGeometry, typeof MeshLineGeometry>;
    meshLineMaterial: MaterialNode<MeshLineMaterial, typeof MeshLineMaterial>;
  }
}

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

interface LanyardProps {
  position?: [number, number, number];
  gravity?: [number, number, number];
  fov?: number;
}

/**
 * Per-breakpoint config.
 * The physics simulation scale (joint lengths, body positions, card attachment)
 * is multiplied by `physicsScale` — this makes the ENTIRE GROUP (rope + card)
 * resize as one unit, exactly like a Photoshop smart object.
 *
 * xRatio: fraction of viewport.width to offset the anchor rightward from center.
 * fov:    camera vertical FOV — lower = more zoomed in = group appears larger.
 */
const SCREEN_CONFIG = {
  desktop: {
    fov: 20,
    physicsScale: 1.0,  // reference size
    xRatio: 0.25,       // right side, matches original working value
    dpr: [1, 2] as [number, number],
    timeStep: 1 / 60,
  },
  tablet: {
    fov: 22,
    physicsScale: 0.88,
    xRatio: 0.14,
    dpr: [1, 1.5] as [number, number],
    timeStep: 1 / 30,
  },
  mobile: {
    fov: 22,            // same zoom level as tablet — card proportional to screen
    physicsScale: 0.80, // smaller physics scale so card fits right side without overflow
    xRatio: 0.25,       // same right-side ratio as desktop → card on right, text on left
    dpr: [1, 1.5] as [number, number],
    timeStep: 1 / 30,
  },
};

function getScreenSize(w: number): ScreenSize {
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

export default function Lanyard3D({
  position = [0, 0, 30],
  gravity = [0, -40, 0],
}: LanyardProps) {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    setScreenSize(getScreenSize(window.innerWidth));
    const onResize = () => setScreenSize(getScreenSize(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const cfg = SCREEN_CONFIG[screenSize];

  return (
    <div className={styles.wrapper}>
      <Canvas
        camera={{ position, fov: cfg.fov }}
        dpr={cfg.dpr}
        gl={{ alpha: true }}
        onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), 0)}
        // Pakai document.body sebagai event source supaya canvas bisa pointer-events:none
        // tapi dragging tetap jalan karena R3F raycast dari koordinat body
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
      >
        <ambientLight intensity={Math.PI} />
        <Suspense fallback={null}>
          {/*
            key=screenSize forces the entire physics world to remount when the
            breakpoint changes — giving a clean simulation start at the new scale.
          */}
          <Physics key={screenSize} gravity={gravity} timeStep={cfg.timeStep}>
            <Band screenSize={screenSize} />
          </Physics>
          <Environment blur={0.75}>
            <Lightformer intensity={2}  color="white" position={[0, -1, 5]}    rotation={[0, 0, Math.PI / 3]}         scale={[100, 0.1, 1]} />
            <Lightformer intensity={3}  color="white" position={[-1, -1, 1]}   rotation={[0, 0, Math.PI / 3]}         scale={[100, 0.1, 1]} />
            <Lightformer intensity={3}  color="white" position={[1, 1, 1]}     rotation={[0, 0, Math.PI / 3]}         scale={[100, 0.1, 1]} />
            <Lightformer intensity={10} color="white" position={[-10, 0, 14]}  rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
          </Environment>
        </Suspense>
      </Canvas>
    </div>
  );
}

function Band({
  maxSpeed = 50,
  minSpeed = 0,
  screenSize = 'desktop' as ScreenSize,
}) {
  const band   = useRef<any>();
  const fixed  = useRef<any>();
  const j1     = useRef<any>();
  const j2     = useRef<any>();
  const j3     = useRef<any>();
  const card   = useRef<any>();
  const groupRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  const cfg = SCREEN_CONFIG[screenSize];

  // ── Scale every spatial quantity by physicsScale ──────────────────────────
  const S = cfg.physicsScale;          // alias for readability
  const xOffset    = viewport.width * cfg.xRatio;
  const anchorY    = 9  * S;           // how high above center the anchor hangs
  const segStep    = 2  * S;           // vertical gap between rope segments
  const attachY    = 1.8 * S;          // where rope attaches on card top
  const cardY      = -7.75 * S;        // card body position below anchor
  const cardVisualScale = 1.6 * S;     // visual mesh scale
  const ropePoints = screenSize === 'desktop' ? 32 : 20;

  // Stable vectors (allocated once per render cycle)
  const vec      = new THREE.Vector3();
  const ang      = new THREE.Vector3();
  const rot      = new THREE.Vector3();
  const dir      = new THREE.Vector3();
  const cardTop  = new THREE.Vector3();
  const cardQuat = new THREE.Quaternion();
  const anchorPos = new THREE.Vector3();

  const segmentProps = {
    type: 'dynamic' as const,
    canSleep: true,
    colliders: false as any,
    angularDamping: 4,
    linearDamping: 4,
  };

  const { nodes, materials } = useGLTF('/card.glb') as any;
  const texture    = useTexture('/lanyard/lanyard-rope.png');
  const customCard = useTexture('/lanyard/Lanyard-3.png');
  customCard.colorSpace = THREE.SRGBColorSpace;

  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ])
  );
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);

  // Joints — lengths also scale with S
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], segStep]);
  useRopeJoint(j1,    j2, [[0, 0, 0], [0, 0, 0], segStep]);
  useRopeJoint(j2,    j3, [[0, 0, 0], [0, 0, 0], segStep]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, attachY, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    // Sync kinematic anchor to the Three.js group world position
    if (groupRef.current && fixed.current) {
      groupRef.current.getWorldPosition(anchorPos);
      fixed.current.setNextKinematicTranslation(anchorPos);
    }

    // Drag
    if (dragged && dragged instanceof THREE.Vector3) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    }

    // Rope curve update
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current.lerped)
          ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const dist = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + dist * (maxSpeed - minSpeed))
        );
      });

      const ct = card.current.translation();
      const cr = card.current.rotation();
      cardQuat.set(cr.x, cr.y, cr.z, cr.w);
      cardTop.set(0, attachY, 0).applyQuaternion(cardQuat);

      curve.points[0].set(ct.x + cardTop.x, ct.y + cardTop.y, ct.z + cardTop.z);
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(ropePoints));

      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      {/* ── Anchor group — moving this moves the entire lanyard ── */}
      <group ref={groupRef} position={[xOffset, anchorY, 0]}>
        <RigidBody ref={fixed} type="kinematicPosition" canSleep={false} colliders={false as any} />

        <RigidBody position={[0, -segStep * 1, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1 * S]} />
        </RigidBody>
        <RigidBody position={[0, -segStep * 2, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1 * S]} />
        </RigidBody>
        <RigidBody position={[0, -segStep * 3, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1 * S]} />
        </RigidBody>

        <RigidBody
          position={[0, cardY, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          {/* Collider also scales with S */}
          <CuboidCollider args={[0.8 * S, 1.125 * S, 0.01]} />

          {/* Visual card mesh — entire group scales as one unit */}
          <group scale={cardVisualScale}>
            <mesh
              onPointerOver={() => hover(true)}
              onPointerOut={() => hover(false)}
              onPointerUp={e => {
                (e.target as any).releasePointerCapture(e.pointerId);
                drag(false);
              }}
              onPointerDown={e => {
                (e.target as any).setPointerCapture(e.pointerId);
                drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())));
              }}
            >
              <planeGeometry args={[1.5, 2.25]} />
              <meshBasicMaterial
                map={customCard}
                transparent={true}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </RigidBody>
      </group>

      {/* ── Rope mesh ── */}
      <mesh ref={band} frustumCulled={false}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#111111"
          depthTest={true}
          resolution={[1000, 1000] as any}
          useMap={1}
          map={texture}
          repeat={[-4, 1] as any}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}

useGLTF.preload('/card.glb');
