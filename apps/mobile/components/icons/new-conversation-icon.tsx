import { MessageCirclePlus } from "lucide-react-native";

const DEFAULT_SIZE = 24;
const ICON_COLOR = "#f97316"; // orange-500

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
        fill={ICON_COLOR}
        strokeWidth={1.5}
      />
    );
  }

  return <MessageCirclePlus size={size} color={ICON_COLOR} />;
}
