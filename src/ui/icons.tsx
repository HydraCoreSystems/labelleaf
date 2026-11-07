import React from "react";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { MARK } from "./markGeometry";
import { theme } from "./theme";

/**
 * The LabelLeaf mark. "line" draws the tag and leaf as line work, for use
 * inside the app. "solid" fills the tag and cuts the leaf out of it, as on the
 * app icon.
 */
export function Mark({
  size = 28,
  variant = "line",
  color = theme.accent,
  opacity = 1,
}: {
  size?: number;
  variant?: "line" | "solid";
  color?: string;
  opacity?: number;
}) {
  const { tag, tilt, tiltCenter } = MARK;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={opacity} accessibilityElementsHidden importantForAccessibility="no">
      <G rotation={tilt} origin={`${tiltCenter.x}, ${tiltCenter.y}`}>
        {variant === "line" ? (
          <>
            <Rect x={tag.x} y={tag.y} width={tag.width} height={tag.height} rx={tag.radius} fill="none" stroke={color} strokeWidth={MARK.lineWidth} />
            <Path d={MARK.leafPath} fill="none" stroke={color} strokeWidth={MARK.lineWidth} strokeLinejoin="round" />
            <Path d={MARK.veinPath} stroke={theme.gold} strokeWidth={MARK.veinWidth} strokeLinecap="round" />
          </>
        ) : (
          <>
            <Rect x={tag.x} y={tag.y} width={tag.width} height={tag.height} rx={tag.radius} fill={color} />
            <Path d={MARK.leafPath} fill={theme.bg} />
            <Path d={MARK.veinPath} stroke={theme.gold} strokeWidth={MARK.veinWidth} strokeLinecap="round" />
          </>
        )}
      </G>
    </Svg>
  );
}

export function ScissorsIcon({ size = 16, color = theme.accentDark }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={6} cy={7.5} r={2.5} stroke={color} strokeWidth={2} />
      <Circle cx={6} cy={16.5} r={2.5} stroke={color} strokeWidth={2} />
      <Path d="M8 8.5L20 18M8 15.5L20 6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Six dots, the usual sign for something you can drag. */
export function GripIcon({ size = 20, color = theme.muted }: { size?: number; color?: string }) {
  const dots = [
    [8, 5], [16, 5],
    [8, 12], [16, 12],
    [8, 19], [16, 19],
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      {dots.map(([cx, cy]) => (
        <Rect key={`${cx}-${cy}`} x={cx - 1.7} y={cy - 1.7} width={3.4} height={3.4} rx={1.7} fill={color} />
      ))}
    </Svg>
  );
}

export type Direction = "up" | "down" | "left" | "right";
const ROTATION: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 };

export function ArrowIcon({ direction, size = 22, color = theme.accentDark }: { direction: Direction; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
      <G rotation={ROTATION[direction]} origin="12, 12">
        <Path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}
