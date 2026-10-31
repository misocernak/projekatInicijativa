<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class SitemapTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    public function test_sitemap_lists_pages_and_public_initiatives_but_not_hidden_ones(): void
    {
        config(['app.url' => 'https://lepsasrbija.com']);
        $visible = $this->makeInitiative();
        $hidden = $this->makeInitiative(['hidden_at' => now()]);

        $response = $this->get('/sitemap.xml')->assertOk();
        $xml = $response->getContent();

        $this->assertStringContainsString('application/xml', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('<loc>https://lepsasrbija.com/realizovano</loc>', $xml);
        $this->assertStringContainsString("<loc>https://lepsasrbija.com/inicijative/{$visible->id}</loc>", $xml);
        $this->assertStringNotContainsString($hidden->id, $xml);
    }
}
