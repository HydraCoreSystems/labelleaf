import React, { useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { GripIcon } from "./icons";

/**
 * The grip at the edge of a queue card. Dragging it up or down moves the card
 * with the finger. `onDrop` gets how far it traveled; the screen turns that
 * into a new position. A 44 by 44 target.
 */
export function DragHandle({
  translateY,
  onStart,
  onDrop,
  label,
}: {
  translateY: Animated.Value;
  onStart: () => void;
  onDrop: (dy: number) => void;
  label: string;
}) {
  const startRef = useRef(onStart);
  const dropRef = useRef(onDrop);
  startRef.current = onStart;
  dropRef.current = onDrop;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => startRef.current(),
        onPanResponderMove: (_e, g) => translateY.setValue(g.dy),
        onPanResponderRelease: (_e, g) => dropRef.current(g.dy),
        onPanResponderTerminate: () => dropRef.current(0),
      }),
    [translateY]
  );

  return (
    <View {...pan.panHandlers} style={styles.handle} accessibilityRole="adjustable" accessibilityLabel={label}>
      <GripIcon />
    </View>
  );
}

const styles = StyleSheet.create({
  handle: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: -10, marginTop: -8 },
});
