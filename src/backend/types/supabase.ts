export type Bookmark = {
    id: string;
    user_id: string;
    title: string;
    url: string;
    ai_summary: string | null;
    ai_category: string | null;
    color: string | null;
    created_at: string;
};
