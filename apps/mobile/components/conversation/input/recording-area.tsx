/**
 * Recording Area Component
 *
 * Displays the active recording state with timer and waveform.
 */

import React from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { COLORS } from "@project/core/theme";
import { formatDuration } from "./utils";

interface RecordingAreaProps {
  duration: number;
  spectrum: Uint8Array | null;
  isPaused: boolean;
}

export function RecordingArea({
  duration,
  spectrum,
  isPaused,
}: RecordingAreaProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      className="px-4 py-4"
    >
      <View className="flex-row items-center gap-4">
        {/* Timer */}
        <Text
          className="text-lg font-medium text-foreground w-14"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatDuration(duration)}
        </Text>

        {/* Animated Waveform */}
        <View className="flex-1 justify-center mt-0.5">
          <WaveformVisualizer
            spectrum={spectrum}
            isActive={!isPaused}
            mode="live"
            barColor={isPaused ? COLORS.mutedForeground : undefined}
          />
        </View>
      </View>
    </Animated.View>
  );
}
