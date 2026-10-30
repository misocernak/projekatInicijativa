<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\City;
use Illuminate\Http\JsonResponse;

class ReferenceController extends Controller
{
    public function cities(): JsonResponse
    {
        return response()->json(
            City::orderBy('name')->get()->map(fn (City $c) => [
                'id' => $c->slug,
                'name' => $c->name,
                'lat' => $c->lat,
                'lng' => $c->lng,
            ])->values()
        );
    }

    public function categories(): JsonResponse
    {
        return response()->json(
            Category::orderBy('id')->get()->map(fn (Category $c) => [
                'id' => $c->slug,
                'label' => $c->name,
            ])->values()
        );
    }
}
