<?php

namespace Tests\Feature;

use App\Models\PageView;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class TrafficTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36';
    private const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148 Safari/604.1';

    private function track(array $body, string $agent = self::CHROME, string $ip = '10.0.0.1')
    {
        return $this->withHeaders(['User-Agent' => $agent])
            ->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/track', $body);
    }

    public function test_visit_is_recorded_without_cookies_or_ip(): void
    {
        $response = $this->spa()->track(['path' => '/realizovano/', 'referrer' => 'https://www.facebook.com/x/y']);

        $response->assertNoContent();
        $this->assertCount(0, $response->headers->getCookies(), 'brojanje ne sme da postavlja kolačiće');

        $view = PageView::firstOrFail();
        $this->assertSame('/realizovano', $view->path);
        $this->assertSame('facebook.com', $view->source);
        $this->assertSame('desktop', $view->device);
        $this->assertStringNotContainsString('10.0.0.1', json_encode($view->toArray()));
    }

    public function test_utm_source_wins_over_referrer_and_own_site_is_direct(): void
    {
        $this->track(['path' => '/', 'source' => 'Instagram', 'referrer' => 'https://l.facebook.com/']);
        $this->track(['path' => '/o-projektu', 'referrer' => 'https://lepsasrbija.com/']);

        $this->assertSame('instagram', PageView::where('path', '/')->value('source'));
        $this->assertNull(PageView::where('path', '/o-projektu')->value('source'));
    }

    public function test_bots_and_invalid_paths_are_ignored(): void
    {
        $this->track(['path' => '/'], 'Googlebot/2.1 (+http://www.google.com/bot.html)')->assertNoContent();
        $this->track(['path' => '/'], 'facebookexternalhit/1.1')->assertNoContent();
        $this->track(['path' => '/<script>'])->assertStatus(422);
        $this->track(['path' => 'bez-kose-crte'])->assertStatus(422);

        $this->assertSame(0, PageView::count());
    }

    public function test_same_visitor_counts_once_per_day_and_phone_is_mobile(): void
    {
        $this->track(['path' => '/']);
        $this->track(['path' => '/inicijative']);
        $this->track(['path' => '/'], self::PHONE, '10.0.0.2');

        $this->assertSame(3, PageView::count());
        $this->assertSame(2, PageView::distinct()->count('visitor'));
        $this->assertSame(1, PageView::where('device', 'mobile')->count());
    }

    public function test_admin_sees_traffic_and_regular_users_do_not(): void
    {
        $initiative = $this->makeInitiative(['title' => 'Sadnja drveća']);
        PageView::create(['visited_on' => now('Europe/Belgrade')->toDateString(), 'path' => '/inicijative/'.$initiative->id, 'visitor' => 'a', 'device' => 'desktop', 'source' => 'viber']);
        PageView::create(['visited_on' => now('Europe/Belgrade')->toDateString(), 'path' => '/', 'visitor' => 'a', 'device' => 'mobile']);
        PageView::create(['visited_on' => now('Europe/Belgrade')->subDays(40)->toDateString(), 'path' => '/', 'visitor' => 'b', 'device' => 'desktop']);

        $this->spa()->actingAs(User::factory()->create())->getJson('/admin/traffic')->assertForbidden();

        $r = $this->spa()->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/admin/traffic?range=30')->assertOk();
        $r->assertJsonPath('totals.today.views', 2)
            ->assertJsonPath('totals.today.visitors', 1)
            ->assertJsonPath('totals.last30.views', 2)
            ->assertJsonPath('totals.allTime.views', 3)
            ->assertJsonCount(30, 'daily')
            ->assertJsonCount(12, 'monthly')
            ->assertJsonPath('pages.0.views', 1)
            ->assertJsonPath('devices.mobile', 1)
            ->assertJsonPath('sources.0.views', 1);
        $this->assertContains('Sadnja drveća', collect($r->json('pages'))->pluck('title')->all());
    }
}
