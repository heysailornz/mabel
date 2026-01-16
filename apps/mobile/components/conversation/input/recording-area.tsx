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
  metering: number | null;
  isPaused: boolean;
}

export function RecordingArea({ duration, metering, isPaused }: RecordingAreaProps) {
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
        <View className="flex-1">
          <WaveformVisualizer
            metering={metering}
            isActive={!isPaused}
            barColor={isPaused ? COLORS.mutedForeground : undefined}
          />
        </View>

        {/* Pause indicator */}
        {isPaused && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
            <Text className="text-sm text-muted-foreground">Paused</Text>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}
