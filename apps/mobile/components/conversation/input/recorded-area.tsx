/**
 * Recorded Area Component
 *
 * Displays the recorded audio with playback controls.
 */

import React, { useCallback } from "react";
import { View, Pressable } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Play, Pause } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { WaveformVisualizer } from "@/components/waveform-visualizer";
import { COLORS } from "@project/core/theme";
import { formatDuration } from "./utils";

interface RecordedAreaProps {
  duration: number;
  spectrumHistory?: number[][];
  isPlaying: boolean;
  onPlayback: () => void;
}

export function RecordedArea({
  duration,
  spectrumHistory,
  isPlaying,
  onPlayback,
}: RecordedAreaProps) {
  const handlePlayback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlayback();
  }, [onPlayback]);

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      className="px-4 py-4"
    >
      <Card
        className="flex-row items-center gap-3 rounded-full px-4 py-3 border-border"
        style={{ borderCurve: "continuous" }}
      >
        {/* Play/Pause button */}
        <Pressable
          onPress={handlePlayback}
          className="h-10 w-10 items-center justify-center rounded-full bg-green-600"
          style={{ borderCurve: "continuous" }}
        >
          {isPlaying ? (
            <Pause size={18} fill={COLORS.icon.white} color={COLORS.icon.white} />
          ) : (
            <Play size={18} fill={COLORS.icon.white} color={COLORS.icon.white} />
          )}
        </Pressable>

        {/* Static Waveform */}
        <View className="flex-1">
          <WaveformVisualizer
            spectrumHistory={spectrumHistory}
            isActive={false}
            mode="static"
          />
        </View>

        {/* Duration */}
        <Text
          className="text-base text-muted-foreground"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {formatDuration(duration)}
        </Text>
      </Card>
    </Animated.View>
  );
}
