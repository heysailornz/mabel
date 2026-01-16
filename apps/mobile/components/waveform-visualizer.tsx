/**
 * WaveformVisualizer Component
 *
 * Animated waveform bars that respond to audio metering data.
 * Uses Reanimated for smooth 60fps animations.
 */

import { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { normalizeMeteringValue } from "@project/core";
import { COLORS } from "@project/core/theme";

const BAR_COUNT = 20;
const BAR_WIDTH = 4;
const BAR_GAP = 2;
const MIN_HEIGHT = 6;
const MAX_HEIGHT = 24;

// Static heights for idle/paused state
const STATIC_HEIGHTS = [
  6, 10, 8, 14, 12, 10, 16, 8, 12, 14, 10, 6, 12, 8, 14, 10, 12, 8, 6, 10,
];

interface WaveformVisualizerProps {
  /** Current metering value (dB) from audio recorder */
  metering: number | null;
  /** Whether currently recording/animating */
  isActive: boolean;
  /** Bar color (defaults to muted foreground) */
  barColor?: string;
}

/**
 * Single animated bar component
 */
function AnimatedBar({
  index,
  metering,
  isActive,
  barColor,
}: {
  index: number;
  metering: number | null;
  isActive: boolean;
  barColor: string;
}) {
  const height = useSharedValue(STATIC_HEIGHTS[index]);

  // Calculate target height based on metering
  useEffect(() => {
    if (!isActive) {
      // Return to static height when not active
      height.value = withSpring(STATIC_HEIGHTS[index], {
        damping: 15,
        stiffness: 150,
      });
      return;
    }

    // Normalize metering (-60 to 0 dB) to 0-1
    const normalized = normalizeMeteringValue(metering);

    // Add some variation per bar for visual interest
    const variation = Math.sin(index * 0.5 + Date.now() * 0.005) * 0.2 + 0.8;
    const targetHeight = interpolate(
      normalized * variation,
      [0, 1],
      [MIN_HEIGHT, MAX_HEIGHT]
    );

    height.value = withSpring(targetHeight, {
      damping: 12,
      stiffness: 200,
    });
  }, [metering, isActive, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
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

export function WaveformVisualizer({
  metering,
  isActive,
  barColor = COLORS.mutedForeground,
}: WaveformVisualizerProps) {
  // Memoize bar indices
  const barIndices = useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => i), []);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: BAR_GAP,
        height: MAX_HEIGHT,
      }}
    >
      {barIndices.map((index) => (
        <AnimatedBar
          key={index}
          index={index}
          metering={metering}
          isActive={isActive}
          barColor={barColor}
        />
      ))}
    </View>
  );
}
