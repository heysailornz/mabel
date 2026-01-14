import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  AppSidebar,
  SidebarProvider,
  MainContent,
} from "@/components/features/conversations";
import { getConversations } from "@/server/actions/conversations";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Get practitioner data
  const { data: practitioner } = await supabase
    .from("practitioners")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Get conversations for sidebar
  const conversations = await getConversations();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <AppSidebar
          conversations={conversations}
          user={{
            email: user.email || "",
            full_name: practitioner?.full_name,
          }}
        />
        <MainContent>{children}</MainContent>
      </div>
    </SidebarProvider>
  );
}
