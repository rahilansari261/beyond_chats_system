<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ArticleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return \App\Models\Article::paginate(10);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'source_url' => 'required|url|unique:articles,source_url',
            'image_url' => 'nullable|url',
        ]);

        $article = \App\Models\Article::create($validated);
        return response()->json($article, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return \App\Models\Article::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $article = \App\Models\Article::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'content' => 'sometimes|string',
            'enhanced_content' => 'nullable|string',
            'source_url' => 'sometimes|url|unique:articles,source_url,' . $id,
            'image_url' => 'nullable|url',
            'cite1' => 'nullable|string',
            'cite2' => 'nullable|string',
        ]);

        $article->update($validated);
        return response()->json($article);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        \App\Models\Article::destroy($id);
        return response()->json(['message' => 'Deleted successfully']);
    }

    public function scrape()
    {
        try {
            $client = new \GuzzleHttp\Client();
            
            // 1. Get Main Page to find Last Page number
            $response = $client->get(config('services.scraping.url'));
            $html = (string) $response->getBody();
            $crawler = new \Symfony\Component\DomCrawler\Crawler($html);
            
            // Find pagination links
            $pageNumbers = $crawler->filter('.page-numbers');
            $lastPage = 1;
            
            if ($pageNumbers->count() > 0) {
                 $pageNumbers->each(function ($node) use (&$lastPage) {
                     $text = $node->text();
                     if (is_numeric($text) && $text > $lastPage) {
                         $lastPage = $text;
                     }
                 });
            }

            $articlesCollected = [];
            $articlesCount = 0;
            $currentPage = $lastPage;
            
            // Loop until we have 5 articles or run out of pages
            while ($articlesCount < 5 && $currentPage >= 1) {
                
                $baseUrl = rtrim(config('services.scraping.url'), '/');
                $targetUrl = "{$baseUrl}/page/{$currentPage}/";
                try {
                    $response = $client->get($targetUrl);
                } catch (\Exception $e) {
                     // If page not found, skip
                     $currentPage--;
                     continue;
                }
                
                $pageHtml = (string) $response->getBody();
                $pageCrawler = new \Symfony\Component\DomCrawler\Crawler($pageHtml);

                $articleNodes = $pageCrawler->filter('div.item-details h3 a, h2 a, h3 a, article a.more-link'); 
                
                // Collect unique nodes from this page
                $pageArticles = [];
                foreach ($articleNodes as $node) {
                    $url = $node->getAttribute('href');
                    $title = $node->textContent;
                    
                     if (!$url || strpos($url, '/blogs/') === false) continue;
                     
                     // Avoid duplicates in this run
                     if (isset($pageArticles[$url])) continue;
                     
                     $pageArticles[$url] = $title;
                }
                
                // Reverse to process bottom (oldest) articles first
                $pageArticles = array_reverse($pageArticles);

                foreach ($pageArticles as $url => $title) {
                    if ($articlesCount >= 5) break;

                    // Scrape Content
                    try {
                        $artResponse = $client->get($url);
                        $artHtml = (string) $artResponse->getBody();
                        $artCrawler = new \Symfony\Component\DomCrawler\Crawler($artHtml);

                        $rawContent = $artCrawler->filter('.entry-content, .post-content, article .content')->html();
                        
                        // Cleanup
                        $content = strip_tags($rawContent, '<p><h2><h3><ul><li><strong><em><br><img>');
                        $content = preg_replace('/ class=".*?"/', '', $content);
                        $content = str_replace(["\n", "\t", "\r"], '', $content);
                        $content = preg_replace('/\s+/', ' ', $content);
                        $content = trim($content);

                        $image = null;
                        $imgNode = $artCrawler->filter('meta[property="og:image"]');
                        if ($imgNode->count() > 0) {
                            $image = $imgNode->attr('content');
                        }

                        // Update or Create
                        $article = \App\Models\Article::updateOrCreate(
                            ['source_url' => $url],
                            [
                                'title' => $title,
                                'content' => $content ?: 'Content could not be scraped.',
                                'image_url' => $image
                            ]
                        );

                        $articlesCollected[] = $article;
                        $articlesCount++;

                    } catch (\Exception $e) {
                        continue; 
                    }
                }
                
                $currentPage--;
            }

            return response()->json([
                'message' => "Scraped {$articlesCount} articles starting from page {$lastPage}",
                'articles' => $articlesCollected
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function reset()
    {
        \App\Models\Article::truncate();
        return response()->json(['message' => 'Database reset successfully']);
    }
}
