<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class ArticleApiTest extends TestCase
{
    /**
     * A basic feature test example.
     */
    public function test_can_list_articles()
    {
        \App\Models\Article::create([
            'title' => 'Test Article',
            'content' => 'Content',
            'source_url' => 'http://example.com/1',
        ]);

        $response = $this->getJson('/api/articles');

        $response->assertStatus(200)
                 ->assertJsonStructure(['data', 'links']);
    }

    public function test_can_show_article()
    {
        $article = \App\Models\Article::create([
            'title' => 'Show Article',
            'content' => 'Content Info',
            'source_url' => 'http://example.com/2',
        ]);

        $response = $this->getJson("/api/articles/{$article->id}");

        $response->assertStatus(200)
                 ->assertJson(['title' => 'Show Article']);
    }

    public function test_can_update_article_enhancement()
    {
        $article = \App\Models\Article::create([
            'title' => 'Enhance Me',
            'content' => 'Original',
            'source_url' => 'http://example.com/3',
        ]);

        $response = $this->putJson("/api/articles/{$article->id}", [
            'enhanced_content' => 'Enhanced version'
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Enhanced version', $article->fresh()->enhanced_content);
    }
}
