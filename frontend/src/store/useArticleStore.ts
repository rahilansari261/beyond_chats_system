import { create } from 'zustand';
import axios from 'axios';

interface Article {
    id: number;
    title: string;
    content: string;
    enhanced_content?: string;
    source_url: string;
    image_url?: string;
    created_at: string;
}

interface ArticleStore {
    articles: Article[];
    loading: boolean;
    error: string | null;
    fetchArticles: () => Promise<void>;
    fetchArticle: (id: number) => Promise<Article | null>;
}

export const useArticleStore = create<ArticleStore>((set) => ({
    articles: [],
    loading: false,
    error: null,

    fetchArticles: async () => {
        set({ loading: true, error: null });
        try {
            // Assuming Laravel runs on 8000, need CORS or Proxy.
            // For dev, can point direct if CORS enabled, or proxy in next.config.
            // I'll point direct for now, assuming api is CORS friendly (Laravel 11 default usually open for all in dev).
            const response = await axios.get('http://127.0.0.1:8000/api/articles');
            set({ articles: response.data.data, loading: false });
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    fetchArticle: async (id: number) => {
        set({ loading: true, error: null });
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/articles/${id}`);
            set({ loading: false });
            return response.data;
        } catch (err: any) {
            set({ error: err.message, loading: false });
            return null;
        }
    }
}));
