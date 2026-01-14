"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCirclePlus, PanelLeft, MessageSquare } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { useSidebar } from "./sidebar-context";
import type { ConversationWithPreview } from "@project/core";

interface AppSidebarProps {
  conversations: ConversationWithPreview[];
  user: {
    email: string;
    full_name?: string | null;
  };
}

function NotificationDot({ className }: { className?: string }) {
  return (
    <span
      className={cn("h-2 w-2 rounded-full bg-red-500 flex-shrink-0", className)}
    />
  );
}

function ConversationList({
  conversations,
  currentPath,
  onNavigate,
  notifiedIds,
}: {
  conversations: ConversationWithPreview[];
  currentPath: string;
  onNavigate?: () => void;
  notifiedIds: Set<string>;
}) {
  return (
    <div className="flex-1 overflow-y-auto pb-2">
      <div className="px-4 py-2">
        <span className="text-xs font-medium text-foreground/70">Recents</span>
      </div>
      <nav className="space-y-1 px-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          conversations.map((conversation) => {
            const isActive = currentPath === `/c/${conversation.id}`;
            const hasNotification = notifiedIds.has(conversation.id);
            return (
              <Link
                key={conversation.id}
                href={`/c/${conversation.id}`}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {hasNotification && <NotificationDot />}
                <span className="line-clamp-1">
                  {conversation.title || "New Conversation"}
                </span>
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}

function CollapsedConversationList({
  conversations,
  currentPath,
  notifiedIds,
}: {
  conversations: ConversationWithPreview[];
  currentPath: string;
  notifiedIds: Set<string>;
}) {
  return (
    <div className="flex-1 overflow-y-auto py-2">
      <nav className="space-y-1 px-2">
        {conversations.slice(0, 10).map((conversation) => {
          const isActive = currentPath === `/c/${conversation.id}`;
          const hasNotification = notifiedIds.has(conversation.id);
          return (
            <Tooltip key={conversation.id}>
              <TooltipTrigger asChild>
                <Link
                  href={`/c/${conversation.id}`}
                  className={cn(
                    "relative flex items-center justify-center rounded-md p-2 transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <MessageSquare className="h-5 w-5" />
                  {hasNotification && (
                    <NotificationDot className="absolute top-1 right-1 outline-2 outline-accent animate-pulse" />
                  )}
                  <span className="sr-only">
                    {conversation.title || "New Conversation"}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {conversation.title || "New Conversation"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}

function ExpandedSidebarContent({
  conversations,
  user,
  currentPath,
  onNewChat,
}: {
  conversations: ConversationWithPreview[];
  user: AppSidebarProps["user"];
  currentPath: string;
  onNewChat?: () => void;
}) {
  const { toggle, notifiedConversationIds } = useSidebar();
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        <Logo className="h-5" />
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex"
          onClick={toggle}
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Collapse sidebar</span>
        </Button>
      </div>

      {/* Primary menu */}
      <div className="px-2 pb-2">
        <Link
          href="/hello"
          onClick={onNewChat}
          className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50 transition-colors"
        >
          <MessageCirclePlus className="h-5 w-5 text-orange-500" />
          <span>New task</span>
        </Link>
      </div>

      {/* Conversation list */}
      <ConversationList
        conversations={conversations}
        currentPath={currentPath}
        onNavigate={onNewChat}
        notifiedIds={notifiedConversationIds}
      />

      {/* User profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            {user.full_name || user.email}
          </span>
        </div>
      </div>
    </div>
  );
}

function CollapsedSidebarContent({
  conversations,
  user,
  currentPath,
}: {
  conversations: ConversationWithPreview[];
  user: AppSidebarProps["user"];
  currentPath: string;
}) {
  const { toggle, notifiedConversationIds } = useSidebar();
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="flex h-full flex-col bg-background text-foreground items-center">
      {/* Header */}
      <div className="flex h-14 items-center justify-center px-3 w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggle}>
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Expand sidebar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Expand sidebar
          </TooltipContent>
        </Tooltip>
      </div>

      {/* New task button */}
      <div className="px-3 pb-2 w-full flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-orange-500 hover:text-orange-600"
              asChild
            >
              <Link href="/hello">
                <MessageCirclePlus className="h-5 w-5" />
                <span className="sr-only">New task</span>
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            New task
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Collapsed conversation list */}
      <CollapsedConversationList
        conversations={conversations}
        currentPath={currentPath}
        notifiedIds={notifiedConversationIds}
      />

      {/* User profile */}
      <div className="p-3 w-full flex justify-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {user.full_name || user.email}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function MobileSheetContent({
  conversations,
  user,
  currentPath,
  onClose,
}: {
  conversations: ConversationWithPreview[];
  user: AppSidebarProps["user"];
  currentPath: string;
  onClose: () => void;
}) {
  const { notifiedConversationIds } = useSidebar();
  const initials = user.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        <Logo className="h-5" />
        <SheetClose asChild>
          <Button variant="ghost" size="icon">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </SheetClose>
      </div>

      {/* Primary menu */}
      <div className="px-2 pb-2">
        <Link
          href="/hello"
          onClick={onClose}
          className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50 transition-colors"
        >
          <MessageCirclePlus className="h-5 w-5 text-orange-500" />
          <span>New task</span>
        </Link>
      </div>

      {/* Conversation list */}
      <ConversationList
        conversations={conversations}
        currentPath={currentPath}
        onNavigate={onClose}
        notifiedIds={notifiedConversationIds}
      />

      {/* User profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            {user.full_name || user.email}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ conversations, user }: AppSidebarProps) {
  const pathname = usePathname();
  const { state, isOpen, setIsOpen } = useSidebar();

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop sidebar - visible on md screens and up */}
      <aside
        className={cn(
          "hidden md:flex md:flex-col md:fixed md:inset-y-0 md:border-r md:border-border transition-all duration-300 ease-in-out",
          state === "expanded" ? "md:w-72" : "md:w-16"
        )}
      >
        {state === "expanded" ? (
          <ExpandedSidebarContent
            conversations={conversations}
            user={user}
            currentPath={pathname}
          />
        ) : (
          <CollapsedSidebarContent
            conversations={conversations}
            user={user}
            currentPath={pathname}
          />
        )}
      </aside>

      {/* Mobile sidebar trigger - visible only on small screens */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-40"
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 [&>button]:hidden">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <MobileSheetContent
            conversations={conversations}
            user={user}
            currentPath={pathname}
            onClose={() => setIsOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
