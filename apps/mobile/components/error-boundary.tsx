import { Component, type ReactNode } from "react";
import { View, Pressable } from "react-native";
import { Text } from "@/components/ui/text";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { COLORS } from "@project/core/theme";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to your error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 items-center justify-center bg-background p-6">
          <View className="items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle size={32} color={COLORS.destructive} />
            </View>

            <Text className="text-xl font-semibold text-foreground">
              Something went wrong
            </Text>

            <Text className="text-center text-muted-foreground">
              An unexpected error occurred. Please try again.
            </Text>

            {__DEV__ && this.state.error && (
              <View className="mt-2 max-w-full rounded-lg bg-muted p-3">
                <Text className="text-xs text-muted-foreground">
                  {this.state.error.message}
                </Text>
              </View>
            )}

            <Pressable
              onPress={this.handleRetry}
              className="mt-4 flex-row items-center gap-2 rounded-full bg-primary px-6 py-3 active:opacity-80"
            >
              <RefreshCw size={18} color={COLORS.icon.white} />
              <Text className="font-medium text-primary-foreground">
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}
