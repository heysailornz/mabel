import { MessageCirclePlus } from "lucide-react-native";
import { COLORS } from "@project/core/theme";

const DEFAULT_SIZE = 24;

interface NewConversationIconProps {
  size?: number;
  filled?: boolean;
}

export function NewConversationIcon({
  size = DEFAULT_SIZE,
  filled = true,
}: NewConversationIconProps) {
  if (filled) {
    return (
      <MessageCirclePlus
        size={size}
        color="rgba(255,255,255,0.75)"
        fill={COLORS.accent}
        strokeWidth={1.5}
      />
    );
  }

  return <MessageCirclePlus size={size} color={COLORS.accent} />;
}
