"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter,
  SidebarInset, SidebarProvider,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProgressiveBlur } from "@/components/ui/progressive-blur";
import {
  MessageSquare, Users, Search, X, Send, Smile, Sun, Moon,
  Plus, UserPlus, MoreHorizontal, Heart, Laugh, ThumbsUp, ThumbsDown,
  Trash, Copy, ArrowDown, Info, ExternalLink, Image as ImageIcon,
  ChevronDown, LogOut, Edit,
} from "lucide-react";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import moment from "moment";
import NumberFlow from "@number-flow/react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { siteConfig } from "@/config/siteConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatType = "direct" | "group";
interface DemoReaction { emoji: string; count: number; hasReacted: boolean; }
interface DemoMessage {
  id: string; userId: string; user: string; avatarUrl?: string;
  content: string; type: "text" | "system"; createdAt: Date;
  isDeleted?: boolean; reactions: DemoReaction[];
}
interface DemoMember { id: string; name: string; role: "owner" | "admin" | "member"; avatarUrl?: string; }
interface DemoChat {
  id: string; type: ChatType; name?: string; displayName?: string;
  avatarUrl?: string; unreadCount: number; description?: string;
  members?: DemoMember[];
  lastMessage?: { content: string; createdAt: Date; userName: string; };
}

// ─── Sample Data ──────────────────────────────────────────────────────────────

const ME = { id: "demo-user", name: "You (Demo)" };

const INITIAL_CHATS: DemoChat[] = [
  {
    id: "c1", type: "direct", displayName: "Alice Chen",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice",
    unreadCount: 2,
    members: [{ id: "alice", name: "Alice Chen", role: "member", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice" }],
    lastMessage: { content: "Did you check that PR?", createdAt: new Date(Date.now() - 5 * 60000), userName: "Alice" },
  },
  {
    id: "c2", type: "group", name: "🚀 Dev Team", displayName: "🚀 Dev Team",
    avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=devteam",
    unreadCount: 5, description: "Engineering squad — ship it!",
    members: [
      { id: "alice", name: "Alice Chen", role: "admin", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice" },
      { id: "bob", name: "Bob Martinez", role: "member", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob" },
      { id: "carol", name: "Carol Singh", role: "member", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol" },
      { id: ME.id, name: ME.name, role: "member" },
    ],
    lastMessage: { content: "Build passed ✅", createdAt: new Date(Date.now() - 20 * 60000), userName: "Bob" },
  },
  {
    id: "c3", type: "direct", displayName: "Bob Martinez",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob",
    unreadCount: 0,
    members: [{ id: "bob", name: "Bob Martinez", role: "member", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=bob" }],
    lastMessage: { content: "Let's catch up Friday!", createdAt: new Date(Date.now() - 2 * 3600000), userName: "Bob" },
  },
  {
    id: "c4", type: "group", name: "🎨 Design Review", displayName: "🎨 Design Review",
    avatarUrl: "https://api.dicebear.com/9.x/shapes/svg?seed=design",
    unreadCount: 0, description: "Weekly design critiques",
    members: [
      { id: "carol", name: "Carol Singh", role: "owner", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol" },
      { id: "alice", name: "Alice Chen", role: "member", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=alice" },
      { id: ME.id, name: ME.name, role: "member" },
    ],
    lastMessage: { content: "Love the new color palette!", createdAt: new Date(Date.now() - 24 * 3600000), userName: "Carol" },
  },
  {
    id: "c5", type: "direct", displayName: "Carol Singh",
    avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol",
    unreadCount: 1,
    members: [{ id: "carol", name: "Carol Singh", role: "member", avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=carol" }],
    lastMessage: { content: "Can you review my design?", createdAt: new Date(Date.now() - 3 * 3600000), userName: "Carol" },
  },
];

const mk = (id: string, uid: string, user: string, content: string, minsAgo: number, reactions: DemoReaction[] = [], avatarUrl?: string, type: "text" | "system" = "text"): DemoMessage => ({
  id, userId: uid, user, content, type, avatarUrl, reactions,
  createdAt: new Date(Date.now() - minsAgo * 60000),
});

const INITIAL_MESSAGES: Record<string, DemoMessage[]> = {
  c1: [
    mk("m1", "alice", "Alice Chen", "Hey! Long time no chat 👋", 60, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
    mk("m2", ME.id, "You", "Haha yeah, been super busy with the new feature!", 58, [{ emoji: "❤️", count: 1, hasReacted: false }]),
    mk("m3", "alice", "Alice Chen", "How's it going? Any blockers?", 45, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
    mk("m4", ME.id, "You", "Smooth sailing so far 🚀 The auth flow is finally working.", 40, [{ emoji: "👍", count: 2, hasReacted: true }]),
    mk("m5", "alice", "Alice Chen", "Nice! Did you check that PR I opened yesterday?", 5, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
    mk("m6", "alice", "Alice Chen", "It fixes the race condition in the message hook", 4, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
  ],
  c2: [
    mk("m10", "alice", "Alice Chen", "Alice created the group", 200, [], undefined, "system"),
    mk("m11", "alice", "Alice Chen", "Good morning team! 🌅", 120, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
    mk("m12", "bob", "Bob Martinez", "Morning! Deployments look clean 🎉", 115, [{ emoji: "👍", count: 3, hasReacted: true }], "https://api.dicebear.com/9.x/avataaars/svg?seed=bob"),
    mk("m13", "carol", "Carol Singh", "Just pushed the UI updates, please review!", 90, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=carol"),
    mk("m14", ME.id, "You", "On it! The new sidebar looks great btw 🎉", 85, [{ emoji: "❤️", count: 2, hasReacted: false }]),
    mk("m15", "alice", "Alice Chen", "Agreed. Shipping at 3pm today?", 60, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
    mk("m16", ME.id, "You", "Let's do it 💪", 55, []),
    mk("m17", "bob", "Bob Martinez", "Build passed ✅", 20, [{ emoji: "🎉", count: 4, hasReacted: false }], "https://api.dicebear.com/9.x/avataaars/svg?seed=bob"),
  ],
  c3: [
    mk("m20", "bob", "Bob Martinez", "Hey, are you free for a quick call?", 200, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=bob"),
    mk("m21", ME.id, "You", "Sure! When works for you?", 195, []),
    mk("m22", "bob", "Bob Martinez", "How about Friday at 2pm?", 180, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=bob"),
    mk("m23", ME.id, "You", "Let's catch up Friday!", 120, []),
  ],
  c4: [
    mk("m30", "carol", "Carol Singh", "Carol created the group", 1600, [], undefined, "system"),
    mk("m31", "carol", "Carol Singh", "Hey everyone! Sharing the new color palette for review 🎨", 1500, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=carol"),
    mk("m32", "alice", "Alice Chen", "The contrast ratios look much better now 👌", 1490, [{ emoji: "❤️", count: 1, hasReacted: false }], "https://api.dicebear.com/9.x/avataaars/svg?seed=alice"),
    mk("m33", ME.id, "You", "Love the new color palette!", 1440, [{ emoji: "👍", count: 2, hasReacted: true }]),
  ],
  c5: [
    mk("m40", "carol", "Carol Singh", "Hi! Working on the new landing page mockup", 200, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=carol"),
    mk("m41", ME.id, "You", "Oh nice! Looking forward to it", 190, []),
    mk("m42", "carol", "Carol Singh", "Can you review my design?", 170, [], "https://api.dicebear.com/9.x/avataaars/svg?seed=carol"),
  ],
};

const QUICK_REACTIONS = [
  { emoji: "👍", Icon: ThumbsUp }, { emoji: "👎", Icon: ThumbsDown },
  { emoji: "❤️", Icon: Heart }, { emoji: "😂", Icon: Laugh },
];

const genId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const formatDateSeparator = (date: moment.Moment) => {
  const today = moment();
  const yesterday = moment().subtract(1, "day");
  if (date.isSame(today, "day")) return "Today";
  if (date.isSame(yesterday, "day")) return "Yesterday";
  if (date.isSame(today, "year")) return date.format("dddd, MMMM D");
  return date.format("dddd, MMMM D, YYYY");
};

function isEmoji(char: string) {
  if (char.length === 2) return /\p{Extended_Pictographic}/u.test(char);
  return false;
}

const renderMessageContent = (content: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.split(urlRegex).map((part, i) =>
    part.match(urlRegex)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline decoration-current hover:opacity-80 break-all" onClick={e => e.stopPropagation()}>{part}</a>
      : part
  );
};

// ─── Scroll to bottom button (exact copy from Messages.tsx) ───────────────────

const ScrollToBottomButton = React.memo(({
  scrollAreaRef, messagesEndRef,
}: { scrollAreaRef: React.RefObject<HTMLDivElement | null>; messagesEndRef: React.RefObject<HTMLDivElement | null>; }) => {
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement;
    if (!scrollContainer) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!scrollContainer) return;
          const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
          setShowScrollBottom(prev => {
            const should = scrollHeight - scrollTop - clientHeight > 300;
            return prev !== should ? should : prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };
    scrollContainer.addEventListener("scroll", handleScroll);
    const tid = setTimeout(handleScroll, 100);
    return () => { scrollContainer.removeEventListener("scroll", handleScroll); clearTimeout(tid); };
  }, [scrollAreaRef]);

  return (
    <AnimatePresence>
      {showScrollBottom && (
        <motion.div key="scroll-to-bottom" layoutId="scroll-to-bottom"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}
          className="absolute bottom-32 right-4">
          <Button size="icon"
            className="rounded-full shadow-lg z-20 bg-black hover:bg-black/90 dark:bg-white dark:hover:bg-white cursor-pointer"
            onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); setShowScrollBottom(false); }}>
            <ArrowDown className="!h-5 !w-5 text-white dark:text-black" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
ScrollToBottomButton.displayName = "ScrollToBottomButton";

// ─── Main Demo Page ───────────────────────────────────────────────────────────

export default function DemoPage() {
  const { theme, setTheme } = useTheme();
  const [chats, setChats] = useState<DemoChat[]>(INITIAL_CHATS);
  const [messages, setMessages] = useState<Record<string, DemoMessage[]>>(INITIAL_MESSAGES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<"all" | "direct" | "group" | "unread">("all");
  const [search, setSearch] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTypingDemo, setIsTypingDemo] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [isTextareaMinHeight, setIsTextareaMinHeight] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const emojiBtnRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const selectedChat = useMemo(() => chats.find(c => c.id === selectedId) ?? null, [chats, selectedId]);
  const currentMsgs = useMemo(() => (selectedId ? messages[selectedId] ?? [] : []), [messages, selectedId]);
  const totalUnread = useMemo(() => chats.reduce((s, c) => s + (c.unreadCount ?? 0), 0), [chats]);

  // Scroll to bottom on new messages
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentMsgs.length, selectedId]);

  // Focus input on chat select
  useEffect(() => { if (selectedId) setTimeout(() => inputRef.current?.focus(), 10); }, [selectedId]);

  // Textarea auto-resize (exact match to MessageInput)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const newHeight = Math.min(inputRef.current.scrollHeight, 120);
      inputRef.current.style.height = `${newHeight}px`;
      setIsTextareaMinHeight(newHeight === 40);
    }
  }, [input]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e: MouseEvent) => {
      if (emojiPickerRef.current?.contains(e.target as Node)) return;
      if (emojiBtnRef.current?.contains(e.target as Node)) return;
      setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showEmoji]);

  // Escape to deselect (matches real chat)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedId(null); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const chatName = (c: DemoChat) => c.type === "direct" ? (c.displayName ?? "DM") : (c.name ?? "Group");

  const filteredChats = useMemo(() => {
    const q = search.toLowerCase();
    return chats
      .filter(c => {
        if (filter === "unread") return (c.unreadCount ?? 0) > 0;
        if (filter !== "all" && c.type !== filter) return false;
        if (q) {
          const name = (c.displayName ?? c.name ?? "").toLowerCase();
          const last = c.lastMessage?.content?.toLowerCase() ?? "";
          return name.includes(q) || last.includes(q);
        }
        return true;
      })
      .sort((a, b) => (b.lastMessage?.createdAt?.getTime() ?? 0) - (a.lastMessage?.createdAt?.getTime() ?? 0));
  }, [chats, filter, search]);

  const handleSelectChat = (chat: DemoChat) => {
    setSelectedId(chat.id);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    setInput("");
  };

  // Simulated bot auto-reply
  const simulateReply = useCallback((chatId: string, chat: DemoChat) => {
    const pool = chat.type === "direct"
      ? ["That sounds great! 😊", "Totally agree with you on that.", "Interesting! Tell me more 🤔", "Haha, good point 😂", "Yeah, makes sense!", "👍", "Let me check and get back to you!"]
      : ["Nice update! 🙌", "Looks good to me 👍", "Can we discuss this on the call?", "Great work everyone! 🎉", "I'll take a look at it.", "Agreed!", "Ships tomorrow? 🚀"];

    const nonMe = (chat.members ?? []).filter(m => m.id !== ME.id);
    if (!nonMe.length) return;
    const sender = nonMe[Math.floor(Math.random() * nonMe.length)];

    setIsTypingDemo(true);
    setTimeout(() => {
      setIsTypingDemo(false);
      const reply: DemoMessage = {
        id: genId(), userId: sender.id, user: sender.name, avatarUrl: sender.avatarUrl,
        content: pool[Math.floor(Math.random() * pool.length)],
        type: "text", createdAt: new Date(), reactions: [],
      };
      setMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), reply] }));
      setChats(prev => prev.map(c => c.id === chatId
        ? { ...c, lastMessage: { content: reply.content, createdAt: reply.createdAt, userName: sender.name } }
        : c));
    }, 1200 + Math.random() * 1000);
  }, []);

  const handleSend = () => {
    if (!input.trim() || !selectedId || !selectedChat) return;
    const msg: DemoMessage = {
      id: genId(), userId: ME.id, user: "You", content: input.trim(),
      type: "text", createdAt: new Date(), reactions: [],
    };
    setMessages(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] ?? []), msg] }));
    setChats(prev => prev.map(c => c.id === selectedId
      ? { ...c, lastMessage: { content: msg.content, createdAt: msg.createdAt, userName: "You" } }
      : c));
    setInput("");
    setShowEmoji(false);
    simulateReply(selectedId, selectedChat);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleReaction = (chatId: string, msgId: string, emoji: string) => {
    setMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] ?? []).map(msg => {
        if (msg.id !== msgId) return msg;
        const existing = msg.reactions.find(r => r.emoji === emoji);
        if (existing) {
          return {
            ...msg,
            reactions: msg.reactions
              .map(r => r.emoji !== emoji ? r : { ...r, hasReacted: !r.hasReacted, count: r.hasReacted ? r.count - 1 : r.count + 1 })
              .filter(r => r.count > 0),
          };
        }
        return { ...msg, reactions: [...msg.reactions, { emoji, count: 1, hasReacted: true }] };
      }),
    }));
  };

  const handleDelete = (chatId: string, msgId: string) => {
    setMessages(prev => ({
      ...prev,
      [chatId]: (prev[chatId] ?? []).map(msg => msg.id === msgId ? { ...msg, isDeleted: true } : msg),
    }));
  };

  const isGroupChat = selectedChat?.type === "group";

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">

        {/* ══ Sidebar (floating, exact match to real) ══════════════════════════ */}
        <Sidebar variant="floating">
          <SidebarContent className="flex-1 overflow-hidden">
            <div className="flex flex-col h-full">

              {/* Header */}
              <div className="px-4 py-2">
                <div className="flex items-end justify-between">
                  <h2 className="text-lg font-semibold">{siteConfig.name}</h2>
                  <div className="flex space-x-2">
                    {theme === "light" ? (
                      <Button size="icon" onClick={() => setTheme("dark")} className="cursor-pointer rounded-full">
                        <Sun className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    ) : (
                      <Button size="icon" onClick={() => setTheme("light")} className="cursor-pointer rounded-full">
                        <Moon className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary"
                          className="h-9 w-9 p-0 rounded-full hover:bg-accent cursor-pointer data-[state=open]:bg-accent">
                          <Plus className="h-4 w-4 rotate-90" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-48 rounded-xl">
                        <DropdownMenuItem className="cursor-pointer rounded-lg"
                          onClick={() => alert("Demo mode — sign up to search real users!")}>
                          <UserPlus className="h-4 w-4 mr-2" /><span>Search Users</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer rounded-lg"
                          onClick={() => alert("Demo mode — sign up to create groups!")}>
                          <Users className="h-4 w-4 mr-2" /><span>New Group</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="relative px-4 py-2">
                <Search className="absolute w-4 h-4 left-7 top-4.5 text-muted-foreground pointer-events-none" />
                <Input className="pl-9 pr-9 rounded-full" placeholder="Search chats..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                {search && (
                  <Button variant="ghost" size="sm" className="absolute right-6 top-3.5 h-6 w-6 p-0"
                    onClick={() => setSearch("")}><X className="h-3 w-3" /></Button>
                )}
              </div>

              {/* Filter pills */}
              <div className="flex space-x-2 rounded-full mx-4 p-1">
                {(["all", "unread", "direct", "group"] as const).map(f => (
                  <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
                    onClick={() => setFilter(f)}
                    className="rounded-full text-[12px] px-4! h-7! cursor-pointer capitalize">{f === "all" ? "All" : f === "unread" ? "Unread" : f === "direct" ? "Direct" : "Groups"}</Button>
                ))}
              </div>

              {/* Chat list */}
              <div className="flex-1">
                {filteredChats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <div className="mb-2">
                      {search.trim() ? <Search className="h-8 w-8 mx-auto mb-2" /> :
                        filter === "group" ? <Users className="h-8 w-8 mx-auto mb-2" /> :
                          <MessageSquare className="h-8 w-8 mx-auto mb-2" />}
                    </div>
                    <p>{search.trim() ? `No chats found for "${search}"` :
                      `No ${filter === "all" ? "chats" : filter === "group" ? "groups" : filter === "unread" ? "unread chats" : "direct chats"} yet`}</p>
                  </div>
                ) : (
                  <ScrollArea className="p-2 h-[70vh]">
                    {filteredChats.map(chat => (
                      <div key={chat.id}
                        onClick={() => handleSelectChat(chat)}
                        className={`flex items-center mb-1 space-x-3 p-3 border border-transparent rounded-2xl cursor-pointer hover:bg-muted transition-colors
                          ${selectedId === chat.id ? "!bg-border" :
                            (chat.unreadCount ?? 0) > 0 && selectedId !== chat.id ? "bg-primary/10 border-primary/30! hover:bg-primary/20" : ""}`}>
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={chat.avatarUrl} alt={chatName(chat)} />
                          <AvatarFallback>
                            {chat.type === "group" ? <Users className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-sm truncate text-accent-foreground">{chatName(chat)}</p>
                            <span className="text-xs text-muted-foreground">
                              {chat.lastMessage?.createdAt
                                ? moment(chat.lastMessage.createdAt).format("l") === moment().format("l")
                                  ? moment(chat.lastMessage.createdAt).format("LT")
                                  : moment(chat.lastMessage.createdAt).format("ll")
                                : moment(chat.lastMessage?.createdAt).format("l")}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {chat.lastMessage
                                ? `${chat.lastMessage.userName.split(" ")[0]}: ${chat.lastMessage.content}`
                                : chat.description ?? (chat.type === "group" ? "Group chat" : "No messages yet")}
                            </p>
                            <div className="flex items-center space-x-1">
                              {(chat.unreadCount ?? 0) > 0 && selectedId !== chat.id && (
                                <Badge variant="destructive" className="text-xs min-w-[20px] rounded-full px-1.5 py-0">
                                  {chat.unreadCount > 99 ? "99+" : <NumberFlow value={chat.unreadCount} format={{ notation: "compact" }} locales="en-US" />}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                )}
              </div>
            </div>
          </SidebarContent>

          {/* Footer — matches UserFooter structure */}
          <SidebarFooter className="pb-4 pt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted cursor-pointer transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs font-bold bg-primary text-primary-foreground">Y</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">You (Demo)</p>
                    <p className="text-xs text-muted-foreground truncate">demo@example.com</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 rounded-xl">
                <DropdownMenuItem className="cursor-pointer rounded-lg"
                  onClick={() => alert("Demo mode — sign up to edit your profile!")}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer rounded-lg"
                  onClick={() => alert("Demo mode — sign up to access settings!")}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign Out
                </DropdownMenuItem>
                <div className="border-t my-1" />
                <a href={siteConfig.url} target="_blank" rel="noopener noreferrer">
                  <DropdownMenuItem className="cursor-pointer rounded-lg text-primary">
                    <ExternalLink className="h-4 w-4 mr-2" /> Sign Up for Real App
                  </DropdownMenuItem>
                </a>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* ══ Main Content (SidebarInset — exact match) ═══════════════════════ */}
        <SidebarInset className="flex-1 bg-transparent! relative md:my-2 md:mr-2 md:border rounded-3xl">

          {/* Chat Header — exact match to ChatHeader.tsx */}
          <div className="flex items-center justify-between px-3 py-2 absolute top-0 left-0 w-full z-10">
            <div className="flex items-center space-x-3">
              {selectedChat ? (
                <>
                  <Avatar className="w-8 h-8 cursor-pointer">
                    <AvatarImage src={selectedChat.avatarUrl} alt={chatName(selectedChat)} />
                    <AvatarFallback>
                      {chatName(selectedChat)[0]?.toUpperCase() ?? "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{chatName(selectedChat)}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedChat.type === "group" ? "Group chat" : "Direct message"}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex items-center space-x-2">
              {selectedChat && (
                <Button variant="ghost" size="icon" className="cursor-pointer"
                  onClick={() => alert(`${chatName(selectedChat)}\n${selectedChat.type === "group" ? `${selectedChat.members?.length ?? 0} members\n${selectedChat.description ?? ""}` : "Direct message"}\n\nThis is demo mode.`)}>
                  <Info className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Messages — exact match to Messages.tsx */}
          <ScrollArea ref={scrollAreaRef}
            className={`flex-1 overflow-y-auto relative mask-to-top-bottom backdrop-blur-md ${selectedChat ? 'bg-[url("/bg.png")] dark:bg-[url("/bg-dark.png")]' : ""}`}>
            <div className={`p-4 ${selectedChat ? "pt-20 pb-24" : ""} h-full`}>

              {!selectedChat ? (
                /* Empty state — exact match */
                <div className="h-[85vh] flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-40 animate-pulse" />
                  <p className="text-xl font-semibold mb-2">Welcome to {siteConfig.name} Demo!</p>
                  <p className="text-sm opacity-70">Select a chat from the sidebar to start exploring.</p>
                  {showBanner && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="relative mt-6 max-w-sm bg-primary/10 border border-primary/30 rounded-2xl p-4 text-sm text-left">
                      <button className="absolute top-2 right-2 opacity-50 hover:opacity-100 cursor-pointer" onClick={() => setShowBanner(false)}>
                        <X className="h-4 w-4" />
                      </button>
                      <p className="font-semibold text-primary mb-2">🎮 Interactive Demo Mode</p>
                      <ul className="space-y-1 text-muted-foreground text-xs">
                        <li>💬 <b>Send messages</b> — get simulated replies</li>
                        <li>❤️ <b>React</b> to any message with emoji</li>
                        <li>🗑️ <b>Delete</b> your own messages</li>
                        <li>🔍 <b>Filter &amp; search</b> chats in the sidebar</li>
                        <li>🌙 <b>Toggle</b> dark / light mode</li>
                      </ul>
                      <a href={siteConfig.url} target="_blank" rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1 text-primary hover:underline font-medium text-xs">
                        <ExternalLink className="h-3 w-3" /> Sign up for the real experience →
                      </a>
                    </motion.div>
                  )}
                </div>
              ) : currentMsgs.length === 0 ? (
                <div className="h-[75vh] flex flex-col items-center justify-center text-center text-muted-foreground py-8">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-semibold mb-1">No messages yet</p>
                  <p className="text-sm opacity-70">Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Messages list — exact match to Messages.tsx render logic */}
                  {currentMsgs.map((message, index) => {
                    const isCurrentUser = message.userId === ME.id;
                    const formattedTime = moment(message.createdAt).format("LT");
                    const showDate = index === 0 || !moment(message.createdAt).isSame(moment(currentMsgs[index - 1].createdAt), "day");
                    const isSameUserAsPrev = index > 0 && currentMsgs[index - 1].userId === message.userId && !showDate;
                    const shouldShowAvatar = isGroupChat && !isSameUserAsPrev;

                    return (
                      <React.Fragment key={`${message.id}-${index}`}>

                        {/* Date Separator */}
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <div className="bg-muted/60 text-muted-foreground text-xs px-3 py-1.5 rounded-full shadow-sm">
                              {formatDateSeparator(moment(message.createdAt))}
                            </div>
                          </div>
                        )}

                        {/* System Message — exact match */}
                        {message.type === "system" ? (
                          <div className="flex justify-center my-2">
                            <div className="flex items-center gap-1.5 bg-muted/50 border border-border/40 text-muted-foreground text-[11px] px-3 py-1 rounded-full shadow-sm max-w-[80%] text-center leading-snug">
                              <span>{message.content}</span>
                            </div>
                          </div>
                        ) : (
                          /* Regular user message — exact match to Messages.tsx */
                          <div
                            className={`group flex items-start space-x-2 ${isSameUserAsPrev ? "mb-1" : "mb-2"} ${isCurrentUser ? "flex-row-reverse space-x-reverse" : ""}`}
                            data-message-id={message.id}
                          >
                            {shouldShowAvatar ? (
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={message.avatarUrl} alt={message.user || "User"} />
                                <AvatarFallback>{(message.user || "U").charAt(0).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            ) : isGroupChat ? (
                              <div className="w-8 h-8" />
                            ) : null}

                            <div className={`flex-1 max-w-lg ${isCurrentUser ? "text-right" : ""}`}>
                              {shouldShowAvatar && !isCurrentUser && (
                                <p className="font-semibold text-sm mb-1 text-foreground/90">{message.user.split(" ")[0] || "Unknown User"}</p>
                              )}
                              <div className={`relative w-fit ${isCurrentUser ? "ml-auto" : ""} group`}>
                                {/* Message bubble */}
                                {message.isDeleted ? (
                                  <div className={`px-2.5 py-1.5 rounded-xl w-fit relative shadow-sm ${isCurrentUser ? "bg-primary/90 ml-auto" : "bg-muted"}`}>
                                    <div className="text-sm text-left clearfix">
                                      <em className="text-muted-foreground/80">This message was deleted</em>
                                      <span className="float-right text-[10px] text-muted-foreground/70 ml-3 mt-1">{formattedTime}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`px-2.5 py-1.5 rounded-xl w-fit relative shadow-sm hover:shadow-md transition-all text-sm
                                    ${isCurrentUser ? "bg-primary/90 ml-auto text-primary-foreground" : "bg-muted hover:bg-muted/80"}
                                    ${isEmoji(message.content) ? "bg-transparent text-4xl! p-0! hover:bg-transparent! shadow-none!" : ""}`}>
                                    <div className="leading-relaxed text-inherit text-left clearfix whitespace-pre-wrap break-words">
                                      {renderMessageContent(message.content)}
                                      <span className={`float-right text-[10px] opacity-70 ml-3 mt-1.5 ${isEmoji(message.content) ? "text-muted-foreground" : "text-inherit"}`}>
                                        {formattedTime}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Message Actions — exact match to MessageActions.tsx */}
                                {!message.isDeleted && selectedId && (
                                  <div className={`absolute top-0 ${isCurrentUser ? "-left-7" : "-right-7"}`}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm"
                                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="rounded-2xl">
                                        {/* Quick reactions */}
                                        <div className="flex items-center justify-around p-1 border-b">
                                          {QUICK_REACTIONS.map(({ emoji }) => (
                                            <Button key={emoji} variant="ghost" size="sm"
                                              className="h-8 w-8 p-0 text-lg hover:bg-muted cursor-pointer"
                                              onClick={() => handleReaction(selectedId, message.id, emoji)}>
                                              {emoji}
                                            </Button>
                                          ))}
                                        </div>
                                        {/* Copy */}
                                        <DropdownMenuItem className="cursor-pointer rounded-lg"
                                          onClick={() => navigator.clipboard.writeText(message.content)}>
                                          <Copy className="mr-1 h-4 w-4" /> Copy
                                        </DropdownMenuItem>
                                        {/* Delete (own messages only) */}
                                        {isCurrentUser && (
                                          <DropdownMenuItem
                                            onClick={() => handleDelete(selectedId, message.id)}
                                            className="cursor-pointer rounded-lg hover:bg-destructive! hover:text-destructive-foreground!">
                                            <Trash className="mr-1 h-4 w-4 hover:text-destructive-foreground!" /> Delete message
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuLabel className="flex items-center gap-2 opacity-80 float-end text-xs">
                                          {formattedTime}
                                        </DropdownMenuLabel>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </div>

                              {/* Reactions — exact match */}
                              {message.reactions && message.reactions.length > 0 && (
                                <div className={`flex flex-wrap gap-1.5 mt-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                                  {message.reactions.map((reaction, ri) => (
                                    <div
                                      key={`${reaction.emoji}-${ri}`}
                                      className={`flex items-center space-x-1 px-1 py-0.5 rounded-full text-xs border cursor-pointer transition-all hover:scale-105 shadow-sm
                                        ${reaction.hasReacted
                                          ? "bg-primary/25 border-primary text-black dark:text-white font-medium"
                                          : "bg-muted border-muted-foreground/20 hover:bg-muted/80"}`}
                                      title={`${reaction.count} reaction${reaction.count > 1 ? "s" : ""}`}
                                      onClick={() => handleReaction(selectedId!, message.id, reaction.emoji)}>
                                      <span className="flex items-center gap-0.5">{reaction.emoji}
                                        <NumberFlow value={reaction.count} format={{ notation: "compact" }} locales="en-US" className="pr-1" />
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Typing Indicator — exact match */}
              {isTypingDemo && selectedChat && (
                <div className="flex items-end gap-2 my-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {selectedChat.type === "group" && (
                    <div className="flex -space-x-2 mb-1">
                      {(selectedChat.members ?? []).filter(m => m.id !== ME.id).slice(0, 1).map(m => (
                        <Avatar key={m.id} className="w-6 h-6 border-2 border-background">
                          <AvatarImage src={m.avatarUrl} alt={m.name} />
                          <AvatarFallback className="text-[10px]">{m.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1 h-8 items-center bg-muted px-3 py-2 rounded-2xl rounded-tl-none">
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={endRef} />
            </div>

            {/* Scroll to bottom button */}
            <ScrollToBottomButton scrollAreaRef={scrollAreaRef} messagesEndRef={endRef} />

            {/* Progressive blur — exact match */}
            <ProgressiveBlur height="8%" position="bottom" />
            <ProgressiveBlur height="8%" position="top" />
          </ScrollArea>

          {/* Message Input — exact match to MessageInput.tsx layout */}
          {selectedChat && (
            <div className="flex flex-col space-y-2 absolute bottom-0 left-0 w-full">
              <div className="relative flex items-end px-3 py-2 space-x-2">

                {/* Image upload button (disabled in demo, but present for UI match) */}
                <Button variant="outline" size="icon"
                  className="rounded-full cursor-pointer bg-input/30! w-10 h-10"
                  onClick={() => alert("Demo mode — sign up to send images!")}
                  title="Upload image">
                  <ImageIcon className="h-5 w-5" />
                </Button>

                {/* Emoji button */}
                <Button ref={emojiBtnRef} variant="outline" size="icon"
                  className="rounded-full cursor-pointer bg-input/30! w-10 h-10"
                  onClick={() => setShowEmoji(v => !v)}>
                  <Smile className="h-5 w-5" />
                </Button>

                {/* Emoji picker */}
                {showEmoji && (
                  <div ref={emojiPickerRef} className="absolute bottom-full shadow-md rounded-lg left-2 mb-2 z-50">
                    <Picker data={data} onEmojiSelect={(e: { native: string }) => {
                      setInput(prev => prev + e.native);
                      setShowEmoji(false);
                      inputRef.current?.focus();
                    }} theme={theme} previewPosition="none" />
                  </div>
                )}

                {/* Textarea — exact match */}
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className={`flex-1 min-h-[40px] max-h-[120px] py-[10px] px-4 rounded-[20px] text-sm ${isTextareaMinHeight ? "bg-input/30" : "bg-input/80"} focus-visible:ring-0 transition-all shadow-none border border-secondary-foreground/10 resize-none outline-none no-scrollbar`}
                />

                {/* Send button — exact match */}
                <Button onClick={handleSend} disabled={!input.trim()}
                  className="rounded-full w-10 h-10 p-0 hover:scale-105 transition-all disabled:hover:scale-100">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}

        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
