import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TEMPLATES, isPrintable, resolveOffsets } from "../core/templates";
import { preflightLabels } from "../pdf/sheet";
import { dragTarget } from "../queue/reorder";
import { queueToCsv, toLabelContent, type QueueEntry } from "../queue/queue";
import { shareCsv } from "../services/output";
import { useApp } from "../state/AppState";
import { Button, Caption, EmptyState, LabelPreview, Note, ScreenTitle } from "../ui/components";
import { COPY } from "../ui/copy";
import { DragHandle } from "../ui/DragHandle";
import { Mark, ScissorsIcon } from "../ui/icons";
import { theme, type } from "../ui/theme";

const CARD_GAP = 12;

export default function QueueScreen() {
  const { state, remove, move, clearQueue } = useApp();
  const { queue } = state;
  const template = TEMPLATES[state.settings.templateId];
  const stored = state.offsets[template.id];
  const offsets = useMemo(() => resolveOffsets(template, stored), [template, stored]);
  const [tooLong, setTooLong] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);

  // Check every label against the real sheet, so a name that will not fit is flagged here.
  useEffect(() => {
    let live = true;
    if (!isPrintable(template) || queue.length === 0) {
      setTooLong(new Set());
      return;
    }
    preflightLabels({ template, offsets, items: queue.map(toLabelContent), startSlot: 1 })
      .then((warnings) => {
        if (!live) return;
        const perSheet = template.labelsPerSheet;
        setTooLong(new Set(warnings.filter((w) => w.kind === "too_long").map((w) => (w.sheet - 1) * perSheet + (w.slot - 1))));
      })
      .catch(() => live && setTooLong(new Set()));
    return () => {
      live = false;
    };
  }, [queue, template, offsets]);

  async function exportCsv() {
    setMessage("");
    try {
      await shareCsv(queueToCsv(queue), COPY.queue.exportTitle);
    } catch {
      setMessage(COPY.queue.exportFailed);
    }
  }

  function confirmClear() {
    Alert.alert(COPY.queue.clearTitle, COPY.queue.clearBody, [
      { text: COPY.queue.cancel, style: "cancel" },
      { text: COPY.queue.clear, style: "destructive", onPress: clearQueue },
    ]);
  }

  const empty = queue.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <FlatList
        data={queue}
        keyExtractor={(e) => e.id}
        scrollEnabled={!dragging}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brand}>
                <Mark size={28} />
                <Text style={type.wordmark}>{COPY.appName}</Text>
              </View>
              <Button kind="plain" label={COPY.queue.settings} onPress={() => router.push("/settings")} />
            </View>
            <ScreenTitle rule>{COPY.queue.title}</ScreenTitle>
            <Caption style={styles.count}>{COPY.queue.count(queue.length)}</Caption>
            {!empty && <Button label={COPY.queue.add} onPress={() => router.push("/add")} />}
            {tooLong.size > 0 && <View style={styles.warn}><Note tone="warn">{COPY.queue.tooLongMany(tooLong.size)}</Note></View>}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title={COPY.queue.emptyTitle}
            note={COPY.queue.empty}
            action={<Button label={COPY.queue.add} onPress={() => router.push("/add")} />}
          />
        }
        renderItem={({ item, index }) => (
          <QueueCard
            item={item}
            index={index}
            count={queue.length}
            tooLong={tooLong.has(index)}
            onDragState={setDragging}
            onMove={(to) => move(item.id, to)}
          />
        )}
        ListFooterComponent={
          empty ? undefined : (
            <View style={styles.footer}>
              {message ? <Note tone="warn">{message}</Note> : null}
              <Button kind="secondary" label={COPY.queue.export} onPress={exportCsv} />
              <View style={styles.apart} />
              <Button kind="danger" label={COPY.queue.clear} onPress={confirmClear} />
            </View>
          )
        }
      />
      <View style={styles.bar}>
        <Button tall label={COPY.queue.print} disabled={empty} onPress={() => router.push("/print")} />
      </View>
    </SafeAreaView>
  );
}

function QueueCard({
  item,
  index,
  count,
  tooLong,
  onDragState,
  onMove,
}: {
  item: QueueEntry;
  index: number;
  count: number;
  tooLong: boolean;
  onDragState: (dragging: boolean) => void;
  onMove: (toIndex: number) => void;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const height = useRef(0);
  const [lifted, setLifted] = useState(false);

  function menu() {
    Alert.alert(COPY.queue.moveTitle, undefined, [
      ...(index > 0 ? [{ text: COPY.queue.moveUp, onPress: () => onMove(index - 1) }] : []),
      ...(index < count - 1 ? [{ text: COPY.queue.moveDown, onPress: () => onMove(index + 1) }] : []),
      { text: COPY.queue.cancel, style: "cancel" as const },
    ]);
  }

  return (
    <Animated.View
      onLayout={(e) => (height.current = e.nativeEvent.layout.height + CARD_GAP)}
      style={{ transform: [{ translateY: y }], zIndex: lifted ? 10 : 0, opacity: lifted ? 0.92 : 1 }}
    >
      {/* Long press anywhere on the card opens a move menu, for growers who cannot drag. */}
      <Pressable accessible={false} onLongPress={menu} delayLongPress={450}>
      <LabelPreview
        line1={item.line1}
        line2={item.line2}
        mark={item.mark}
        right={
          <DragHandle
            translateY={y}
            label={COPY.queue.reorder}
            onStart={() => {
              setLifted(true);
              onDragState(true);
            }}
            onDrop={(dy) => {
              const to = dragTarget(index, dy, height.current, count);
              y.setValue(0);
              setLifted(false);
              onDragState(false);
              if (to !== index) onMove(to);
            }}
          />
        }
        footer={
          <View>
            {tooLong && <Note tone="warn">{COPY.queue.tooLongOne}</Note>}
            <View style={styles.actions}>
              <Button small kind="secondary" label={COPY.queue.edit} onPress={() => router.push({ pathname: "/add", params: { id: item.id } })} />
              {item.kind === "plant" && (
                <Button
                  small
                  kind="secondary"
                  icon={<ScissorsIcon />}
                  label={COPY.queue.cuttings}
                  onPress={() => router.push({ pathname: "/cuttings", params: { id: item.id } })}
                />
              )}
            </View>
          </View>
        }
      />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  header: { marginBottom: 16 },
  brandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  count: { marginTop: 6, marginBottom: 16 },
  warn: { marginTop: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  footer: { marginTop: 8 },
  apart: { height: 16 },
  bar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border },
});
