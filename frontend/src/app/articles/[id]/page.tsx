"use client";
import { useEffect, useState } from 'react';
import { useArticleStore } from '@/store/useArticleStore';
import Link from 'next/link';
import { ArrowLeft, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ArticleDetail() {
    const { id } = useParams();
    const { fetchArticle, loading, error } = useArticleStore();
    const [article, setArticle] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'original' | 'enhanced'>('original');

    useEffect(() => {
        if (id) {
            fetchArticle(Number(id)).then(data => {
                setArticle(data);
                if (data?.enhanced_content) setViewMode('enhanced');
            });
        }
    }, [id, fetchArticle]);

    if (loading || !article) {
        return (
            <div className="min-h-screen bg-slate-950 flex justify-center items-center">
                <Loader2 className="animate-spin text-indigo-500 w-12 h-12" />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back to Articles</span>
                    </Link>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('original')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${viewMode === 'original' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <BookOpen className="inline w-4 h-4 mr-2" />
                            Original
                        </button>
                        {article.enhanced_content && (
                            <button
                                onClick={() => setViewMode('enhanced')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${viewMode === 'enhanced' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                <Sparkles className="inline w-4 h-4 mr-2" />
                                Enhanced with AI
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero */}
            <div className="relative h-[40vh] w-full overflow-hidden">
                {article.image_url ? (
                    <img src={article.image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                    <div className="w-full h-full bg-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 container mx-auto">
                    <h1 className="text-4xl md:text-5xl font-bold max-w-4xl text-white mb-4 drop-shadow-xl">{article.title}</h1>
                    <a href={article.source_url} target="_blank" className="text-indigo-400 hover:underline text-sm opacity-80">View Source</a>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 py-12 max-w-4xl">
                <div className="bg-slate-900/50 rounded-2xl p-8 md:p-12 border border-white/5 shadow-2xl backdrop-blur-sm">
                    {viewMode === 'enhanced' ? (
                        <div className="prose prose-invert prose-lg max-w-none prose-indigo prose-headings:font-bold prose-headings:text-indigo-100 prose-p:text-slate-300 prose-li:text-slate-300">
                            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg mb-8 text-indigo-200 text-sm flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-400" />
                                This content has been enhanced by our AI engine with real-time web insights.
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: article.enhanced_content }} />
                        </div>
                    ) : (
                        <div className="prose prose-invert prose-lg max-w-none prose-slate prose-headings:text-slate-100 prose-p:text-slate-400">
                            <div dangerouslySetInnerHTML={{ __html: article.content }} />
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
