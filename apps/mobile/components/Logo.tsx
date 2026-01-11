import { Image, ImageStyle, StyleProp } from "react-native";
import { useColorScheme } from "nativewind";

const logoLight = require("@/assets/logo-light.png");
const logoDark = require("@/assets/logo-dark.png");

interface LogoProps {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
}

export function Logo({ width = 120, height = 40, style }: LogoProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Image
      source={colorScheme === "dark" ? logoDark : logoLight}
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
  );
}
