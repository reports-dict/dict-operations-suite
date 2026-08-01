<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\ModulesController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/modules');

Route::middleware('guest')->group(function (): void {
    Route::get('login', [LoginController::class, 'create'])->name('login');
    Route::post('login', [LoginController::class, 'store']);
});

Route::middleware(['auth', 'allowed'])->group(function (): void {
    Route::post('logout', [LoginController::class, 'destroy'])->name('logout');

    Route::get('modules', [ModulesController::class, 'index'])->name('modules');
});
