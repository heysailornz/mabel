import { cn } from "@/lib/utils";
import * as React from "react";
import { Text } from "@/components/ui/text";

type TextProps = React.ComponentProps<typeof Text>;

interface ConversationTextProps extends TextProps {
  bold?: boolean;
}

export function ConversationText({
  className,
  style,
  bold = true,
  ...props
}: ConversationTextProps) {
  return (
    <Text
      className={cn(
        "text-left",
        "text-2xl",
        bold ? "font-noto-semibold" : "font-noto",
        className
      )}
      {...props}
    />
  );
}
