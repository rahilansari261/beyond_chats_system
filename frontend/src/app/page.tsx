"use client";
import { useEffect, useState } from 'react';
import { useArticleStore } from '@/store/useArticleStore';
import Link from 'next/link';
import { ArrowRight, Loader2, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import axios from 'axios';

function ArticleCard({ article }: { article: any }) {
    const [showEnhanced, setShowEnhanced] = useState(false);

    return (
        <div className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col">
            {article.image_url && (
                <div className="h-48 overflow-hidden relative">
                    <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60" />
                </div>
            )}
            <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-2xl font-bold mb-3 text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {article.title}
                </h2>

                <div className="flex items-center gap-2 mb-4">
                    <button
                        onClick={() => setShowEnhanced(false)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${!showEnhanced ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                    >
                        Original
                    </button>
                    {article.enhanced_content && (
                        <button
                            onClick={() => setShowEnhanced(true)}
                            className={`text-xs px-2 py-1 rounded transition-colors flex items-center gap-1 ${showEnhanced ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Sparkles className="w-3 h-3" /> Enhanced
                        </button>
                    )}
                </div>

                <div
                    className="text-slate-400 text-sm mb-6 flex-1 line-clamp-4 leading-relaxed"
                    dangerouslySetInnerHTML={{
                        __html: showEnhanced
                            ? (article.enhanced_content || "No enhanced content yet.")
                            : (article.content.substring(0, 300) + "...")
                    }}
                />

                {showEnhanced && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sources</h4>
                        <div className="flex flex-col gap-1 text-xs text-indigo-400">
                            {article.cite1 && <a href={article.cite1} target="_blank" className="hover:underline truncate">{article.cite1}</a>}
                            {article.cite2 && <a href={article.cite2} target="_blank" className="hover:underline truncate">{article.cite2}</a>}
                            {!article.cite1 && !article.cite2 && <span className="text-slate-600">No sources listed.</span>}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-auto pt-4">
                    <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-800 rounded-md">
                        {new Date(article.created_at).toLocaleDateString()}
                    </span>
                    <Link
                        href={`/articles/${article.id}`}
                        className="inline-flex items-center gap-2 text-indigo-400 font-semibold hover:text-indigo-300 transition-colors group/link"
                    >
                        Read Full
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/link:translate-x-1" />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function Home() {
    const { articles, loading, fetchArticles, error } = useArticleStore();
    const [isScraping, setIsScraping] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const handleScrape = async () => {
        setIsScraping(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/scrape-beyondchats`);
            // Wait a bit or re-fetch
            await fetchArticles();
        } catch (e) {
            console.error(e);
            alert("Scrape failed. Check console.");
        } finally {
            setIsScraping(false);
        }
    };

    const handleEnhance = async () => {
        setIsEnhancing(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_AI_SERVICE_URL}/enhance`);
            await fetchArticles();
        } catch (e) {
            console.error(e);
            alert("Enhance failed. Check console.");
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleReset = async () => {
        if (!confirm("Are you sure you want to delete all articles?")) return;
        setIsResetting(true);
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/reset-db`);
            await fetchArticles();
        } catch (e) {
            console.error(e);
            alert("Reset failed. Check console.");
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-slate-950 to-purple-900/20 pointer-events-none" />
                <div className="container mx-auto px-6 relative z-10 text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-6 drop-shadow-lg">
                        BeyondChats <span className="text-slate-100">Insights</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
                        Curated articles on AI, Chatbots, and Technology, enhanced by our intelligent engine.
                    </p>

                    {/* Controls */}
                    <div className="flex flex-wrap justify-center gap-4">
                        <button
                            onClick={handleScrape}
                            disabled={isScraping || isResetting}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isScraping ? <Loader2 className="animate-spin w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                            Scrape New Articles
                        </button>
                        <button
                            onClick={handleEnhance}
                            disabled={isEnhancing || isResetting || articles.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isEnhancing ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                            Enhance Latest Article
                        </button>
                        <button
                            onClick={handleReset}
                            disabled={isResetting || articles.length === 0}
                            className="bg-red-900/50 hover:bg-red-900/80 text-red-200 px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all border border-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isResetting ? <Loader2 className="animate-spin w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                            Reset DB
                        </button>
                    </div>
                </div>
            </section>

            {/* Content Grid */}
            <section className="container mx-auto px-6 py-12">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg text-center mb-8 backdrop-blur-sm">
                        Error loading articles: {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin text-indigo-500 w-12 h-12" />
                    </div>
                ) : (
                    <>
                        {articles.length === 0 && !error ? (
                            <div className="text-center text-slate-500 py-20">
                                No articles found. Run the scraper first!
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {articles.map((article) => (
                                    <ArticleCard key={article.id} article={article} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </main>
    );
}
