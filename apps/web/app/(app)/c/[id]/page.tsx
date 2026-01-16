import { notFound } from "next/navigation";
import { getConversation } from "@/server/actions/conversations";
import { ConversationMessages } from "@/components/features/conversations/conversation-messages";
import { ConversationInput } from "@/components/features/conversations/conversation-input";

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params;
  const data = await getConversation(id);

  if (!data) {
    notFound();
  }

  const title = data.conversation.title || "New Conversation";

  return (
    <div className="flex h-screen flex-col">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Header - server rendered, sticky at top of scroll container */}
        <header className="pointer-events-none sticky top-0 z-10">
          <div className="pointer-events-auto flex h-14 items-center bg-background px-4 lg:px-6">
            <h1 className="text-base font-medium truncate">{title}</h1>
          </div>
          {/* Gradient fade */}
          <div className="h-5 bg-gradient-to-b from-background to-transparent" />
        </header>

        {/* Messages - client component for realtime */}
        <div className="mx-auto max-w-3xl px-4 pb-6 lg:px-6">
          <ConversationMessages
            conversationId={data.conversation.id}
            initialMessages={data.messages}
          />
        </div>
      </div>

      {/* Conversation input - slightly wider than content, fixed to bottom */}
      <div className="border-t border-border bg-background px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <ConversationInput />
        </div>
      </div>
    </div>
  );
}
