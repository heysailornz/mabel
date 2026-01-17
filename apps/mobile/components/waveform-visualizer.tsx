/**
 * WaveformVisualizer Component
 *
 * Displays audio waveform as vertical bars:
 * - Live mode: Spectrum scrolls from right to left as recording progresses
 * - Static mode: Shows full recording scaled to available width
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { COLORS } from "@project/core/theme";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_TOTAL_WIDTH = BAR_WIDTH + BAR_GAP;
const MIN_HEIGHT = 2;
const MAX_HEIGHT = 24;

interface WaveformVisualizerProps {
  /** Current spectrum data (array of 0-255 values per frequency bin) */
  spectrum?: Uint8Array | null;
  /** Historical spectrum data for static display */
  spectrumHistory?: number[][];
  /** Whether currently recording/animating */
  isActive: boolean;
  /** Bar color (defaults to muted foreground) */
  barColor?: string;
  /** Whether to show as static (completed) or live (recording) */
  mode?: "live" | "static";
}

/**
 * Normalize a spectrum value (0-255) to a height
 */
function normalizeToHeight(value: number): number {
  const normalized = value / 255;
  return MIN_HEIGHT + normalized * (MAX_HEIGHT - MIN_HEIGHT);
}

/**
 * Reduce spectrum bins to a single amplitude value
 * Takes the average of all bins for a balanced representation
 */
function spectrumToAmplitude(spectrum: Uint8Array | number[]): number {
  if (spectrum.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < spectrum.length; i++) {
    sum += spectrum[i];
  }
  return sum / spectrum.length;
}

/**
 * Single animated bar component
 */
function AnimatedBar({
  height,
  barColor,
  index,
  animate,
}: {
  height: number;
  barColor: string;
  index: number;
  animate: boolean;
}) {
  const animatedHeight = useSharedValue(MIN_HEIGHT);

  useEffect(() => {
    if (animate) {
      animatedHeight.value = withTiming(height, {
        duration: 50,
        easing: Easing.out(Easing.quad),
      });
    } else {
      animatedHeight.value = height;
    }
  }, [height, animate, animatedHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: BAR_WIDTH,
          borderRadius: BAR_WIDTH / 2,
          backgroundColor: barColor,
        },
        animatedStyle,
      ]}
    />
  );
}

/**
 * Live waveform - bars scroll in from the right as recording progresses
 */
function LiveWaveform({
  spectrum,
  barColor,
  containerWidth,
  isActive,
}: {
  spectrum: Uint8Array | null;
  barColor: string;
  containerWidth: number;
  isActive: boolean;
}) {
  // Calculate how many bars fit in the container
  const maxBars = Math.floor(containerWidth / BAR_TOTAL_WIDTH);

  // Store history of amplitude values
  const historyRef = useMemo(() => ({ values: [] as number[] }), []);

  // Add new amplitude when spectrum changes (only when active)
  useEffect(() => {
    if (isActive && spectrum) {
      const amplitude = spectrumToAmplitude(spectrum);
      historyRef.values.push(amplitude);

      // Keep only as many values as we can display
      if (historyRef.values.length > maxBars) {
        historyRef.values.shift();
      }
    }
  }, [spectrum, maxBars, historyRef, isActive]);

  // Get display values - pad with empty bars on the left if needed
  const displayValues = useMemo(() => {
    const values = historyRef.values;
    const padding = Math.max(0, maxBars - values.length);
    const paddedValues: number[] = [];

    // Add empty padding on the left
    for (let i = 0; i < padding; i++) {
      paddedValues.push(0);
    }

    // Add actual values
    for (const v of values) {
      paddedValues.push(v);
    }

    return paddedValues;
  }, [spectrum, maxBars, historyRef]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: BAR_GAP,
        height: MAX_HEIGHT,
      }}
    >
      {displayValues.map((value, index) => (
        <AnimatedBar
          key={index}
          index={index}
          height={normalizeToHeight(value)}
          barColor={barColor}
          animate={true}
        />
      ))}
    </View>
  );
}

/**
 * Static waveform - shows full recording scaled to fit container
 */
function StaticWaveform({
  spectrumHistory,
  barColor,
  containerWidth,
}: {
  spectrumHistory: number[][];
  barColor: string;
  containerWidth: number;
}) {
  // Calculate how many bars fit
  const barCount = Math.floor(containerWidth / BAR_TOTAL_WIDTH);

  // Sample the history to fit the available bars
  const displayValues = useMemo(() => {
    if (spectrumHistory.length === 0) return [];

    const result: number[] = [];
    const step = spectrumHistory.length / barCount;

    for (let i = 0; i < barCount; i++) {
      const historyIndex = Math.floor(i * step);
      const spectrum = spectrumHistory[Math.min(historyIndex, spectrumHistory.length - 1)];
      const amplitude = spectrum ? spectrumToAmplitude(spectrum) : 0;
      result.push(amplitude);
    }

    return result;
  }, [spectrumHistory, barCount]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: BAR_GAP,
        height: MAX_HEIGHT,
      }}
    >
      {displayValues.map((value, index) => (
        <AnimatedBar
          key={index}
          index={index}
          height={normalizeToHeight(value)}
          barColor={barColor}
          animate={false}
        />
      ))}
    </View>
  );
}

/**
 * Idle waveform - static bars at minimum height
 */
function IdleWaveform({
  barColor,
  containerWidth,
}: {
  barColor: string;
  containerWidth: number;
}) {
  const barCount = Math.floor(containerWidth / BAR_TOTAL_WIDTH);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: BAR_GAP,
        height: MAX_HEIGHT,
      }}
    >
      {Array.from({ length: barCount }).map((_, index) => (
        <View
          key={index}
          style={{
            width: BAR_WIDTH,
            height: MIN_HEIGHT,
            borderRadius: BAR_WIDTH / 2,
            backgroundColor: barColor,
          }}
        />
      ))}
    </View>
  );
}

export function WaveformVisualizer({
  spectrum,
  spectrumHistory,
  isActive,
  barColor = COLORS.mutedForeground,
  mode = "live",
}: WaveformVisualizerProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  return (
    <View
      style={{ flex: 1, height: MAX_HEIGHT }}
      onLayout={onLayout}
    >
      {containerWidth > 0 && (
        <>
          {mode === "static" && spectrumHistory && spectrumHistory.length > 0 ? (
            <StaticWaveform
              spectrumHistory={spectrumHistory}
              barColor={barColor}
              containerWidth={containerWidth}
            />
          ) : mode === "live" ? (
            <LiveWaveform
              spectrum={spectrum ?? null}
              barColor={barColor}
              containerWidth={containerWidth}
              isActive={isActive}
            />
          ) : (
            <IdleWaveform barColor={barColor} containerWidth={containerWidth} />
          )}
        </>
      )}
    </View>
  );
}
