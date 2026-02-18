"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    LogOut,
    Sparkles,
    Settings,
    Grid3X3,
    LayoutGrid,
    ArrowUpDown,
    RotateCcw,
} from "lucide-react";
import BookmarkCard, { Bookmark } from "./BookmarkCard";
import { createClient } from "@/backend/database/browser";

interface DashboardProps {
    userId: string;
}

type SortMode = "newest" | "oldest" | "title";
type DashboardPrefs = {
    gridCols: 3 | 4;
    sortMode: SortMode;
    autoCloseComposer: boolean;
    showCategoryFilter: boolean;
};

const PREFS_KEY = "bookie_dashboard_preferences_v1";
const ENRICH_TIMEOUT_MS = 30000;
const DEFAULT_PREFS: DashboardPrefs = {
    gridCols: 3,
    sortMode: "newest",
    autoCloseComposer: true,
    showCategoryFilter: true,
};

function normalizeUrl(input: string): string | null {
    const raw = input.trim();
    if (!raw) return null;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
        const parsed = new URL(withProtocol);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
        return parsed.toString();
    } catch {
        return null;
    }
}

function fallbackTitle(url: string): string {
    try {
        const host = new URL(url).hostname.replace("www.", "");
        return host.charAt(0).toUpperCase() + host.slice(1);
    } catch {
        return "Untitled Link";
    }
}

function parsePrefs(raw: string | null): DashboardPrefs {
    if (!raw) return DEFAULT_PREFS;

    try {
        const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
        return {
            gridCols: parsed.gridCols === 4 ? 4 : 3,
            sortMode:
                parsed.sortMode === "oldest" || parsed.sortMode === "title"
                    ? parsed.sortMode
                    : "newest",
            autoCloseComposer: parsed.autoCloseComposer !== false,
            showCategoryFilter: parsed.showCategoryFilter !== false,
        };
    } catch {
        return DEFAULT_PREFS;
    }
}

function readDropUrl(event: React.DragEvent<HTMLInputElement>): string | null {
    const uriList = event.dataTransfer.getData("text/uri-list");
    if (uriList) {
        const firstLine = uriList
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line && !line.startsWith("#"));
        if (firstLine) return firstLine;
    }

    const plain = event.dataTransfer.getData("text/plain").trim();
    return plain || null;
}

export default function Dashboard({ userId }: DashboardProps) {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [titleInput, setTitleInput] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [isAdding, setIsAdding] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isSavingLink, setIsSavingLink] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [prefs, setPrefs] = useState<DashboardPrefs>(DEFAULT_PREFS);
    const [prefsLoaded, setPrefsLoaded] = useState(false);
    const [channelReady, setChannelReady] = useState(false);

    const supabase = useMemo(() => createClient(), []);

    const fetchBookmarks = useCallback(async () => {
        const { data, error } = await supabase
            .from("bookmarks")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching bookmarks:", error);
            return;
        }

        setBookmarks((data as Bookmark[]) ?? []);
    }, [supabase]);

    // Safety refetch on focus/visibility + periodic poll
    useEffect(() => {
        if (!isClient) return;

        const onFocus = () => void fetchBookmarks();
        const onVisible = () => {
            if (document.visibilityState === "visible") void fetchBookmarks();
        };
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisible);

        const intervalId = window.setInterval(() => void fetchBookmarks(), 10000);

        return () => {
            window.removeEventListener("focus", onFocus);
            document.removeEventListener("visibilitychange", onVisible);
            window.clearInterval(intervalId);
        };
    }, [isClient, fetchBookmarks]);

    const triggerEnrichment = useCallback(async (id: string, url: string, title: string) => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);

        try {
            const response = await fetch("/api/ai/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ id, url, title }),
                signal: controller.signal,
            });

            if (!response.ok) throw new Error(`Enrichment failed: ${response.status}`);

            const payload = await response.json();
            const aiTitle = typeof payload?.title === "string" ? payload.title.trim() : "";
            const aiSummary = typeof payload?.summary === "string" ? payload.summary.trim() : "";
            const aiCategory = typeof payload?.category === "string" ? payload.category.trim() : "";

            if (!aiTitle && !aiSummary && !aiCategory) return;

            setBookmarks((prev) =>
                prev.map((bookmark) =>
                    bookmark.id === id
                        ? {
                              ...bookmark,
                              title: aiTitle || bookmark.title,
                              ai_summary: aiSummary || bookmark.ai_summary,
                              ai_category: aiCategory || bookmark.ai_category,
                          }
                        : bookmark
                )
            );
        } catch (error) {
            console.error("AI enrichment trigger error:", error);
            setBookmarks((prev) =>
                prev.map((bookmark) =>
                    bookmark.id === id
                        ? {
                              ...bookmark,
                              ai_summary: bookmark.ai_summary || "Could not analyze this link. Try again later.",
                              ai_category: bookmark.ai_category || "Other",
                          }
                        : bookmark
                )
            );
        } finally {
            window.clearTimeout(timeoutId);
        }
    }, []);

    const handleAddBookmark = useCallback(async () => {
        if (isSavingLink) return;

        const cleanUrl = normalizeUrl(urlInput);
        if (!cleanUrl) {
            setAddError("Please enter a valid URL (http or https).");
            return;
        }

        const title = titleInput.trim() || fallbackTitle(cleanUrl);
        const optimisticId = `temp-${Date.now()}`;

        setAddError(null);
        setIsSavingLink(true);
        setBookmarks((prev) => [
            {
                id: optimisticId,
                url: cleanUrl,
                title,
                ai_summary: null,
                ai_category: null,
                created_at: new Date().toISOString(),
            },
            ...prev,
        ]);
        setUrlInput("");
        setTitleInput("");
        if (prefs.autoCloseComposer) setIsAdding(false);

        try {
            const { data, error } = await supabase
                .from("bookmarks")
                .insert([{ url: cleanUrl, title, user_id: userId }])
                .select()
                .single();

            if (error || !data) throw error || new Error("Bookmark insert failed");

            const persisted = data as Bookmark;
            setBookmarks((prev) =>
                prev.map((bookmark) => (bookmark.id === optimisticId ? persisted : bookmark))
            );

            void triggerEnrichment(persisted.id, cleanUrl, title);
        } catch (error) {
            console.error("Error adding bookmark:", error);
            setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== optimisticId));
            setAddError("Could not save this link. Please try again.");
        } finally {
            setIsSavingLink(false);
        }
    }, [isSavingLink, urlInput, titleInput, prefs.autoCloseComposer, supabase, userId, triggerEnrichment]);

    const handleDeleteBookmark = useCallback(
        async (id: string) => {
            setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
            const { error } = await supabase.from("bookmarks").delete().eq("id", id);
            if (error) {
                console.error("Error deleting bookmark:", error);
                fetchBookmarks();
            }
        },
        [supabase, fetchBookmarks]
    );

    const handleEditBookmark = useCallback(
        async (id: string, updates: Partial<Bookmark>) => {
            setBookmarks((prev) =>
                prev.map((bookmark) => (bookmark.id === id ? { ...bookmark, ...updates } : bookmark))
            );
            const { error } = await supabase.from("bookmarks").update(updates).eq("id", id);
            if (error) {
                console.error("Error updating bookmark:", error);
                fetchBookmarks();
            }
        },
        [supabase, fetchBookmarks]
    );

    const handleLogout = useCallback(async () => {
        await supabase.auth.signOut();
        window.location.reload();
    }, [supabase]);

    useEffect(() => {
        setIsClient(true);
        fetchBookmarks();
    }, [fetchBookmarks]);

    useEffect(() => {
        if (!isClient) return;
        setPrefs(parsePrefs(window.localStorage.getItem(PREFS_KEY)));
        setPrefsLoaded(true);
    }, [isClient]);

    useEffect(() => {
        if (!isClient || !prefsLoaded) return;
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    }, [isClient, prefs, prefsLoaded]);

    useEffect(() => {
        const channel = supabase
            .channel("bookmarks_changes", {
                config: {
                    broadcast: { ack: true },
                    presence: { key: "dashboard" },
                },
            })
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "bookmarks",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        const inserted = payload.new as Bookmark;
                        setBookmarks((prev) => {
                            const withoutTemp = prev.filter(
                                (bookmark) => !(bookmark.id.startsWith("temp-") && bookmark.url === inserted.url)
                            );
                            if (withoutTemp.some((bookmark) => bookmark.id === inserted.id)) {
                                return withoutTemp;
                            }
                            return [inserted, ...withoutTemp];
                        });
                    }

                    if (payload.eventType === "UPDATE") {
                        const updated = payload.new as Bookmark;
                        setBookmarks((prev) =>
                            prev.map((bookmark) =>
                                bookmark.id === updated.id ? { ...bookmark, ...updated } : bookmark
                            )
                        );
                    }

                    if (payload.eventType === "DELETE") {
                        setBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== payload.old.id));
                    }
                }
            )
            .on("status", (status) => {
                if (status === "SUBSCRIBED") setChannelReady(true);
                if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    setChannelReady(false);
                    void fetchBookmarks();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, fetchBookmarks]);

    useEffect(() => {
        if (prefs.showCategoryFilter) return;
        if (selectedCategory !== "ALL") setSelectedCategory("ALL");
    }, [prefs.showCategoryFilter, selectedCategory]);

    const categories = useMemo(() => {
        const unique = Array.from(
            new Set(
                bookmarks
                    .map((bookmark) => bookmark.ai_category)
                    .filter((value): value is string => Boolean(value))
            )
        ).sort((a, b) => a.localeCompare(b));
        return ["ALL", ...unique];
    }, [bookmarks]);

    const processingCount = useMemo(
        () => bookmarks.filter((bookmark) => !bookmark.ai_summary || !bookmark.ai_category).length,
        [bookmarks]
    );

    const filteredBookmarks = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const list = bookmarks.filter((bookmark) => {
            const matchesSearch =
                !q ||
                bookmark.title.toLowerCase().includes(q) ||
                bookmark.url.toLowerCase().includes(q) ||
                (bookmark.ai_category?.toLowerCase() || "").includes(q) ||
                (bookmark.ai_summary?.toLowerCase() || "").includes(q);
            const matchesCategory = selectedCategory === "ALL" || bookmark.ai_category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        return list.sort((a, b) => {
            if (prefs.sortMode === "oldest") {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            if (prefs.sortMode === "title") {
                return a.title.localeCompare(b.title);
            }
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [bookmarks, searchQuery, selectedCategory, prefs.sortMode]);

    if (!isClient) return null;

    return (
        <div className="min-h-screen w-full bg-gray-50 selection:bg-black selection:text-white abstract-bg">
            <div className="sticky top-0 z-40">
                <div className="border-b border-gray-200/50 backdrop-blur-xl bg-white/80">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src="/assets/logo.png" alt="Bookie" className="w-8 h-8 object-contain drop-shadow-sm" />
                            <h1 className="text-xl font-bold tracking-tight text-gray-900 hidden sm:block">Bookie</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsAdding((prev) => !prev)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-200 shadow-sm border ${
                                    isAdding
                                        ? "bg-black text-white border-black"
                                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                            >
                                <Plus className={`w-4 h-4 transition-transform duration-200 ${isAdding ? "rotate-45" : ""}`} />
                                <span className="font-semibold hidden sm:inline">{isAdding ? "Close" : "Add Link"}</span>
                            </button>

                            <div className="h-5 w-px bg-gray-200 mx-0.5" />

                            <div className="relative">
                                <button
                                    onClick={() => setShowSettings((prev) => !prev)}
                                    className={`p-2 rounded-full transition-colors duration-150 ${
                                        showSettings ? "bg-gray-100 text-black" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                    }`}
                                    title="Settings"
                                >
                                    <Settings className="w-4 h-4" />
                                </button>

                                {showSettings ? (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 space-y-4">
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Display</h4>
                                            <div className="flex items-center justify-between rounded-xl border border-gray-100 p-2.5">
                                                <span className="text-sm text-gray-700 font-medium">Grid</span>
                                                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                                                    <button
                                                        onClick={() => setPrefs((prev) => ({ ...prev, gridCols: 3 }))}
                                                        className={`p-1.5 rounded-md ${prefs.gridCols === 3 ? "bg-white shadow-sm text-black" : "text-gray-400"}`}
                                                    >
                                                        <Grid3X3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => setPrefs((prev) => ({ ...prev, gridCols: 4 }))}
                                                        className={`p-1.5 rounded-md ${prefs.gridCols === 4 ? "bg-white shadow-sm text-black" : "text-gray-400"}`}
                                                    >
                                                        <LayoutGrid className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Behavior</h4>
                                            <div className="rounded-xl border border-gray-100 p-2.5 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-700 font-medium">Sort</span>
                                                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                                </div>
                                                <div className="grid grid-cols-3 gap-1">
                                                    {(["newest", "oldest", "title"] as SortMode[]).map((mode) => (
                                                        <button
                                                            key={mode}
                                                            onClick={() => setPrefs((prev) => ({ ...prev, sortMode: mode }))}
                                                            className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold uppercase ${
                                                                prefs.sortMode === mode ? "bg-black text-white" : "bg-gray-100 text-gray-600"
                                                            }`}
                                                        >
                                                            {mode}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-2.5 flex items-center justify-between">
                                                <span className="text-sm text-gray-700 font-medium">Category Filters</span>
                                                <button
                                                    onClick={() =>
                                                        setPrefs((prev) => ({ ...prev, showCategoryFilter: !prev.showCategoryFilter }))
                                                    }
                                                    className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${
                                                        prefs.showCategoryFilter ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                                                    }`}
                                                >
                                                    {prefs.showCategoryFilter ? "On" : "Off"}
                                                </button>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-2.5 flex items-center justify-between">
                                                <span className="text-sm text-gray-700 font-medium">Auto-close Add Link</span>
                                                <button
                                                    onClick={() =>
                                                        setPrefs((prev) => ({ ...prev, autoCloseComposer: !prev.autoCloseComposer }))
                                                    }
                                                    className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase ${
                                                        prefs.autoCloseComposer ? "bg-black text-white" : "bg-gray-100 text-gray-500"
                                                    }`}
                                                >
                                                    {prefs.autoCloseComposer ? "On" : "Off"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="rounded-xl border border-gray-100 p-2 text-center">
                                                <div className="text-[10px] uppercase text-gray-400 font-bold">Bookies</div>
                                                <div className="text-base font-bold text-gray-900">{bookmarks.length}</div>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-2 text-center">
                                                <div className="text-[10px] uppercase text-gray-400 font-bold">Categories</div>
                                                <div className="text-base font-bold text-gray-900">{categories.length - 1}</div>
                                            </div>
                                            <div className="rounded-xl border border-gray-100 p-2 text-center">
                                                <div className="text-[10px] uppercase font-bold text-purple-500">Baking</div>
                                                <div className="text-base font-bold text-gray-900">{processingCount}</div>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 flex gap-2">
                                            <button
                                                onClick={() => setPrefs(DEFAULT_PREFS)}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                Reset
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {isAdding ? (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden border-b border-gray-200/50 backdrop-blur-xl bg-white/95 shadow-xl relative z-30"
                        >
                            <div className="max-w-3xl mx-auto px-4 py-6">
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Title (Optional)</label>
                                        <input
                                            type="text"
                                            value={titleInput}
                                            onChange={(event) => setTitleInput(event.target.value)}
                                            placeholder="My Awesome Link"
                                            className="w-full px-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:bg-white focus:border-black transition-all duration-150 outline-none text-base font-medium placeholder:text-gray-400"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Paste or drop your URL</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="url"
                                                value={urlInput}
                                                onChange={(event) => {
                                                    setUrlInput(event.target.value);
                                                    setAddError(null);
                                                }}
                                                onKeyDown={(event) => event.key === "Enter" && void handleAddBookmark()}
                                                onDrop={(event) => {
                                                    event.preventDefault();
                                                    const dropped = readDropUrl(event);
                                                    if (!dropped) return;
                                                    setUrlInput(dropped);
                                                    setAddError(null);
                                                }}
                                                onDragOver={(event) => event.preventDefault()}
                                                placeholder="https://..."
                                                className="flex-1 pl-4 pr-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:bg-white focus:border-black transition-all duration-150 outline-none text-base font-medium placeholder:text-gray-400"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => void handleAddBookmark()}
                                                disabled={!urlInput.trim() || isSavingLink}
                                                className="px-6 py-3 bg-black text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98] whitespace-nowrap"
                                            >
                                                {isSavingLink ? "Saving..." : "Bake It"}
                                                <Sparkles className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {addError ? <p className="text-xs text-red-500 ml-1">{addError}</p> : null}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {showSettings ? <div className="fixed inset-0 z-30" onClick={() => setShowSettings(false)} /> : null}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
                <div className={`flex flex-col gap-3 mb-8 ${prefs.showCategoryFilter ? "md:flex-row md:items-center md:justify-between" : ""}`}>
                    <div className="relative w-full md:max-w-md group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors duration-150" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search bookmarks..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:border-black focus:ring-1 focus:ring-black transition-all duration-150 outline-none shadow-sm hover:shadow-md"
                        />
                    </div>

                    {prefs.showCategoryFilter ? (
                        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full md:w-auto no-scrollbar">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-150 whitespace-nowrap border ${
                                        selectedCategory === category
                                            ? "bg-black text-white border-black shadow-lg shadow-black/20"
                                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>

                <AnimatePresence mode="popLayout">
                    {filteredBookmarks.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
                                <Sparkles className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {searchQuery || selectedCategory !== "ALL" ? "No matching bookies found" : "Your oven is empty"}
                            </h3>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto">
                                {searchQuery || selectedCategory !== "ALL"
                                    ? "Try adjusting your search terms or filters."
                                    : "Add your first link to start building your knowledge base."}
                            </p>
                        </motion.div>
                    ) : (
                        <div
                            className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                                prefs.gridCols === 4 ? "lg:grid-cols-4 xl:grid-cols-4" : "lg:grid-cols-3"
                            }`}
                        >
                            {filteredBookmarks.map((bookmark) => (
                                <BookmarkCard
                                    key={bookmark.id}
                                    bookmark={bookmark}
                                    onDelete={handleDeleteBookmark}
                                    onEdit={handleEditBookmark}
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
