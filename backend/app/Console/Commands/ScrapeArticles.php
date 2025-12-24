<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ScrapeArticles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:scrape-articles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $client = new \GuzzleHttp\Client();
        $this->info("Fetching blog pagination...");
        
        // 1. Get max page
        $crawler = new \Symfony\Component\DomCrawler\Crawler((string)$client->get('https://beyondchats.com/blogs/')->getBody());
        // Pagination locator: commonly .page-numbers or similar.
        // Based on inspection, it's typically a list of numbers. 
        // Let's assume standard WP/Elementor pagination.
        // We will try to find the last number.
        
        // fallback: start at page 1 and increment until 404 or empty? No, checking visible links is better.
        // The browser agent saw "15".
        // Let's try to extract it dynamically.
        $lastPage = 1;
        $crawler->filter('.page-numbers')->each(function ($node) use (&$lastPage) {
            $text = $node->text();
            if (is_numeric($text) && $text > $lastPage) {
                $lastPage = $text;
            }
        });
        
        $this->info("Detected last page: $lastPage");

        $articlesToProcess = [];
        
        // 2. Fetch from last page backwards
        for ($page = $lastPage; $page >= $lastPage - 1; $page--) {
            if (count($articlesToProcess) >= 5) break;
            
            $this->info("Scraping page $page...");
            $url = "https://beyondchats.com/blogs/page/$page/";
            try {
                $response = $client->get($url);
            } catch (\Exception $e) {
                $this->error("Failed to fetch page $page");
                continue;
            }

            $crawler = new \Symfony\Component\DomCrawler\Crawler((string)$response->getBody());
            
            // Articles are usually in <article> or .elementor-post
            // Browser agent saw 'a' tags with titles.
            $pageArticles = [];
            
            // Extract all article links on the page
            // Inspecting previously: Titles were in <a> tags.
            // Let's target strictly.
            // .elementor-post__title > a  OR  h3 > a
            // Let's grab all links that look like article links (contain /blogs/ and not /page/)
            
            $crawler->filter('article')->each(function ($node) use (&$pageArticles) {
                 // Try to find the link
                 $linkNode = $node->filter('a')->first();
                 if ($linkNode->count() > 0) {
                     $pageArticles[] = [
                         'url' => $linkNode->attr('href'),
                         'title' => $node->filter('h3, h2, h4')->count() ? $node->filter('h3, h2, h4')->text() : $linkNode->text()
                     ];
                 }
            });

            // If empty, try a broader selector because sometimes 'article' tag isn't used
            if (empty($pageArticles)) {
                 $crawler->filter('.elementor-widget-theme-post-content, .blog-post, .post')->each(function ($node) use (&$pageArticles) {
                     // logic
                 });
                 // Fallback: search for specific known structure if above fails?
                 // Browser agent said: "Each article is wrapped in a container... Title within 'a' tag"
                 // Let's assume standard blog loop.
                 
                 // SIMPLIFICATION for this task:
                 // Just grab all links inside the main grid.
                 // The browser agent inspection showed: `[19] (410,272)<a href='...'>...</a>`
            }
            
            // Add to main list.
            // Since we want oldest, and the page 15 has [Old ..... Oldest],
            // We want to reverse the order of THIS page if we want to process strictly oldest first?
            // Actually, we want the 5 oldest.
            // Page 15: [Post 3, Post 2, Post 1 (Oldest)]
            // We want Post 1, Post 2, Post 3...
            // So we take this list, reverse it?
            // If we reverse, we get [Post 1, Post 2, Post 3]
            
            $pageArticles = array_reverse($pageArticles);
            
            foreach ($pageArticles as $art) {
                if (count($articlesToProcess) < 5) {
                    $articlesToProcess[] = $art;
                }
            }
        }

        $this->info("Found " . count($articlesToProcess) . " articles to process.");

        foreach ($articlesToProcess as $meta) {
            $this->processArticle($client, $meta['url'], $meta['title']);
        }
    }

    private function processArticle($client, $url, $title)
    {
        if (\App\Models\Article::where('source_url', $url)->exists()) {
            $this->info("Skipping existing: $title");
            return;
        }

        $this->info("Fetching detail: $url");
        try {
            $response = $client->get($url);
            $crawler = new \Symfony\Component\DomCrawler\Crawler((string)$response->getBody());
            
            // Extract content
            // Selector: .elementor-widget-theme-post-content
            $contentNode = $crawler->filter('.elementor-widget-theme-post-content');
            $content = $contentNode->count() ? trim($contentNode->html()) : '';
            
            // Strip HTML for "content"? Or keep it? 
            // Usually we want text for LLM processing, but HTML for display.
            // "Scrape the main content" -> imply text or HTML. I'll store HTML to be safe, but also strip tags for LLM later.
            
            // If empty, try alternative
            if (!$content) {
                $contentNode = $crawler->filter('.entry-content');
                $content = $contentNode->count() ? trim($contentNode->html()) : '';
            }

            // Image
            $image = null;
            $imgNode = $contentNode->filter('img')->first();
            if ($imgNode->count()) {
                $image = $imgNode->attr('src');
            }

            \App\Models\Article::create([
                'title' => $title,
                'content' => $content ?: 'Content not found', 
                'source_url' => $url,
                'image_url' => $image,
                'enhanced_content' => null
            ]);
            
            $this->info("Saved: $title");

        } catch (\Exception $e) {
            $this->error("Error processing $url: " . $e->getMessage());
        }
    }
}
