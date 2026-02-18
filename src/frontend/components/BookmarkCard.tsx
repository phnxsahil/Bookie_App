"use client";

import { motion } from "framer-motion";
import { Trash2, Edit2, Palette, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useState, memo } from "react";

export interface Bookmark {
    id: string;
    title: string;
    url: string;
    ai_summary: string | null;
    ai_category: string | null;
    created_at: string;
    color?: string | null;
}

interface BookmarkCardProps {
    bookmark: Bookmark;
    onDelete: (id: string) => void;
    onEdit: (id: string, updates: Partial<Bookmark>) => void;
}

const colorOptions = [
    { name: "Blue", value: "#3B82F6" },
    { name: "Purple", value: "#8B5CF6" },
    { name: "Green", value: "#10B981" },
    { name: "Orange", value: "#F59E0B" },
    { name: "Pink", value: "#EC4899" },
    { name: "Red", value: "#EF4444" },
    { name: "Cyan", value: "#06B6D4" },
    { name: "Amber", value: "#F97316" },
    { name: "Teal", value: "#14B8A6" },
    { name: "Gray", value: "#6B7280" },
];

const categoryColors: Record<string, string> = {
    TECHNOLOGY: "#3B82F6",
    DESIGN: "#8B5CF6",
    BUSINESS: "#10B981",
    EDUCATION: "#F59E0B",
    ENTERTAINMENT: "#EC4899",
    NEWS: "#EF4444",
    SOCIAL: "#06B6D4",
    SHOPPING: "#F97316",
    HEALTH: "#14B8A6",
    PRODUCTIVITY: "#2563EB",
    MUSIC: "#9333EA",
    TOOL: "#0D9488",
    OTHER: "#6B7280",
};

const getCategoryColor = (category: string | null) =>
    categoryColors[category?.toUpperCase() || "OTHER"] || "#6B7280";

function BookmarkCard({ bookmark, onDelete, onEdit }: BookmarkCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(bookmark.title);
    const [showColorPicker, setShowColorPicker] = useState(false);

    const displayColor = bookmark.color || getCategoryColor(bookmark.ai_category);
    const isProcessing = !bookmark.ai_summary || !bookmark.ai_category;

    const handleSaveTitle = () => {
        if (editedTitle.trim()) {
            onEdit(bookmark.id, { title: editedTitle.trim() });
            setIsEditing(false);
        }
    };

    const handleColorChange = (color: string) => {
        onEdit(bookmark.id, { color });
        setShowColorPicker(false);
    };

    let hostname = "";
    try {
        hostname = new URL(bookmark.url).hostname;
    } catch {
        hostname = bookmark.url;
    }

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="group relative h-full gpu-accelerated"
        >
            <div className="relative h-full flex flex-col rounded-2xl p-4 bg-white/80 backdrop-blur-lg border border-gray-200/60 shadow-sm hover:shadow-lg transition-shadow duration-200">
                {/* Category Tag & Actions */}
                <div className="flex items-center justify-between mb-3">
                    <div
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: displayColor }}
                    >
                        {bookmark.ai_category || "Processing"}
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <div className="relative">
                            <button
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                className="p-1 rounded-full hover:bg-black/5 transition-colors duration-100"
                                title="Change Color"
                            >
                                <Palette className="w-3.5 h-3.5 text-gray-500" />
                            </button>

                            {showColorPicker && (
                                <div className="absolute top-full right-0 mt-1 p-2.5 rounded-xl shadow-xl z-20 w-44 bg-white border border-gray-100">
                                    <div className="grid grid-cols-5 gap-1.5">
                                        {colorOptions.map((color) => (
                                            <button
                                                key={color.value}
                                                onClick={() => handleColorChange(color.value)}
                                                className="w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform duration-100"
                                                style={{ backgroundColor: color.value }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="p-1 rounded-full hover:bg-black/5 transition-colors duration-100"
                            title="Edit Title"
                        >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>

                        <button
                            onClick={() => onDelete(bookmark.id)}
                            className="p-1 rounded-full hover:bg-red-50 transition-colors duration-100"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                    </div>
                </div>

                {/* Title */}
                {isEditing ? (
                    <input
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                        className="w-full text-base font-bold text-gray-900 bg-transparent border-b-2 border-black focus:outline-none mb-1.5"
                        autoFocus
                    />
                ) : (
                    <h3 className="text-base font-bold text-gray-900 mb-1.5 leading-tight tracking-tight line-clamp-2">
                        {bookmark.title}
                    </h3>
                )}

                {/* URL */}
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-black transition-colors duration-150 mb-4 truncate"
                >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{hostname}</span>
                </a>

                {/* AI Summary Section */}
                <div className="mt-auto">
                    {isProcessing ? (
                        <div className="relative overflow-hidden rounded-lg bg-gray-50/50 p-3 border border-gray-100/50">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
                                <motion.span
                                    className="text-[10px] font-medium italic text-purple-500 uppercase tracking-wider"
                                    animate={{ opacity: [0.6, 1, 0.6], y: [0, -1, 0] }}
                                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    Baking your Bookie
                                </motion.span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="h-1.5 bg-gray-200/50 rounded w-3/4 animate-pulse" />
                                <div className="h-1.5 bg-gray-200/50 rounded w-full animate-pulse" />
                                <div className="h-1.5 bg-gray-200/50 rounded w-5/6 animate-pulse" />
                            </div>
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                        </div>
                    ) : (
                        <div className="rounded-lg bg-gray-50/80 p-3 border border-gray-100 transition-colors duration-150 group-hover:bg-white/60">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles className="w-3 h-3 text-purple-500" />
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Insight</span>
                            </div>
                            <p className="text-xs text-gray-600 font-serif italic leading-relaxed">
                                &quot;{bookmark.ai_summary || "Baking your insight..."}&quot;
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

export default memo(BookmarkCard);
