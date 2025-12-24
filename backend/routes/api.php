<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;



Route::post('/scrape-beyondchats', [\App\Http\Controllers\ArticleController::class, 'scrape']);
Route::post('/reset-db', [\App\Http\Controllers\ArticleController::class, 'reset']);
Route::apiResource('articles', \App\Http\Controllers\ArticleController::class);
