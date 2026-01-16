import { getTimeBasedGreeting } from "@project/core";
import { ConversationInput } from "@/components/features/conversations/conversation-input";

export default function HelloPage() {
  const greeting = getTimeBasedGreeting();

  return (
    <div className="flex h-screen flex-col">
      {/* Main content - centered greeting */}
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="font-serif text-3xl font-medium text-foreground">
            {greeting}
          </h1>
          <p className="text-lg text-muted-foreground">
            Describe your consultation, and I&apos;ll start transcribing it for
            you.
          </p>
        </div>
      </div>

      {/* Conversation input - fixed to bottom */}
      <div className="bg-background px-4 py-3">
        <div className="mx-auto max-w-2xl">
          <ConversationInput />
        </div>
        {/* Disclaimer */}
        <p className="mx-auto mt-1 max-w-4xl text-center text-xs text-muted-foreground/70">
          Mabel is AI and can make mistakes. Always review responses and use
          your own judgement.
        </p>
      </div>
    </div>
  );
}
