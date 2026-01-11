import { cn } from "@/lib/utils";
import * as React from "react";
import { StyleSheet } from "react-native";
import { Text } from "@/components/ui/text";

type TextProps = React.ComponentProps<typeof Text>;

interface ConversationTextProps extends TextProps {
  bold?: boolean;
}

const styles = StyleSheet.create({
  font: {
    fontFamily: "NotoSerif",
  },
});

const stylesBold = StyleSheet.create({
  font: {
    fontFamily: "NotoSerif",
  },
});

export function ConversationText({
  className,
  style,
  bold = true,
  ...props
}: ConversationTextProps) {
  return (
    <Text
      className={cn("text-left", "text-3xl", className)}
      style={[bold ? stylesBold.font : styles.font, style]}
      {...props}
    />
  );
}
