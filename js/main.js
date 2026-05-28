/**
 * JURAGAN PALUGADA SIMULATOR
 * Main Entry Point
 * File ini bertugas sebagai konduktor/pengatur alur utama.
 */

// Mengimpor modul-modul lain (kita akan buat ini di langkah selanjutnya)
import { initEngine } from './core/engine.js';
import { initUI, renderScreen } from './ui/renderer.js';

const app = {
    async init() {
        try {
            console.log("[Main] Memulai Juragan Palugada Simulator...");
            
            // 1. Jalankan Engine (Load save data, inisiasi state, dll)
            // Menggunakan await jika nanti ada proses asinkronus (seperti ambil data dari API)
            await initEngine();
            console.log("[Main] Engine berhasil dimuat.");

            // 2. Siapkan UI dan render layar utama
            initUI();
            renderScreen('dashboard');
            
            console.log("[Main] Game siap dimainkan!");
            
        } catch (error) {
            // Error Boundary: Jika game gagal dimuat, jangan biarkan layar blank
            console.error("[Main] Gagal memuat game:", error);
            
            const gameRoot = document.getElementById('game-root');
            if (gameRoot) {
                gameRoot.innerHTML = `
                    <div class="text-red-500 text-center p-4 bg-slate-900 h-full flex flex-col justify-center items-center">
                        <h2 class="text-2xl font-bold mb-2">Terjadi Kesalahan Kritis</h2>
                        <p class="text-sm text-slate-400 break-words max-w-xs">${error.message}</p>
                        <p class="text-xs text-slate-500 mt-4">Pastikan Anda mengakses ini melalui Local Server (Live Server)</p>
                    </div>
                `;
            }
        }
    }
};

// Pastikan HTML sudah selesai dimuat sebelum menjalankan JS
document.addEventListener('DOMContentLoaded', () => {
    // Beri sedikit delay untuk efek loading pura-pura (bisa dihapus nanti)
    setTimeout(() => {
        app.init();
    }, 1000);
});