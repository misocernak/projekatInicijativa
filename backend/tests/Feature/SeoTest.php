<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class SeoTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private string $shell;

    protected function setUp(): void
    {
        parent::setUp();

        $this->shell = tempnam(sys_get_temp_dir(), 'idx');
        file_put_contents($this->shell, '<!doctype html><html><head><meta charset="UTF-8" />'
            .'<!--seo--><title>Opšti</title><meta name="description" content="opšti" /><!--/seo-->'
            .'</head><body><div id="root"></div></body></html>');
        config(['app.frontend_index' => $this->shell, 'app.url' => 'https://lepsasrbija.com']);
    }

    protected function tearDown(): void
    {
        @unlink($this->shell);
        parent::tearDown();
    }

    public function test_static_page_gets_its_own_title_description_and_default_image(): void
    {
        $html = $this->get('/seo?path=/realizovano')->assertOk()->getContent();

        $this->assertStringContainsString('<title>Realizovano: šta je urađeno kad se složimo | Lepša Srbija</title>', $html);
        $this->assertStringContainsString('property="og:image" content="https://lepsasrbija.com/og-default.png"', $html);
        $this->assertStringContainsString('<div id="root">', $html);
        $this->assertStringNotContainsString('Opšti', $html);
    }

    public function test_initiative_gets_title_description_and_its_own_image(): void
    {
        $initiative = $this->makeInitiative([
            'title' => 'Čišćenje "parka" <script>',
            'description' => 'Čistimo park zajedno sa komšijama.',
            'image_path' => 'initiatives/slika.webp',
        ]);

        $html = $this->get("/seo?path=/inicijative/{$initiative->id}")->assertOk()->getContent();

        $this->assertStringContainsString('Čišćenje &quot;parka&quot; &lt;script&gt; – Niš | Lepša Srbija', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('Niš, Ulica 1. Čistimo park zajedno sa komšijama.', $html);
        $this->assertStringContainsString('content="https://lepsasrbija.com/uploads/initiatives/slika.webp"', $html);
        $this->assertStringContainsString("content=\"https://lepsasrbija.com/inicijative/{$initiative->id}\"", $html);
    }

    public function test_hidden_or_unknown_initiative_is_404_with_default_meta(): void
    {
        $initiative = $this->makeInitiative(['hidden_at' => now()]);

        $this->get("/seo?path=/inicijative/{$initiative->id}")->assertNotFound();
        $this->get('/seo?path=/inicijative/'.str_repeat('Z', 26))->assertNotFound();
    }

    public function test_bot_rewrite_with_original_path_still_reaches_seo(): void
    {
        // .htaccess prosleđuje na /api/seo?path=..., a PHP vidi originalnu putanju
        $this->get('/realizovano?path=/realizovano')->assertOk()->assertSee('Realizovano: šta je urađeno', false);
        $this->get('/nepostojece')->assertNotFound();
    }
}
