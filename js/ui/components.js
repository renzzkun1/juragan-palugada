import { 
    gameState, 
    buyItem, 
    sellItem, 
    payDebt, 
    nextDay, 
    resetGame,
    getUsedWarehouseSpace,
    purchaseUpgrade
} from '../core/engine.js';

import { SHOP_UPGRADES } from '../modules/shop.js';

import {
    getApiKey,
    saveApiKey,
    removeApiKey,
    sendChatMessage
} from '../services/groq.js';

// Menyimpan layar aktif saat ini
let currentScreen = 'dashboard';

// Menyimpan riwayat obrolan secara lokal agar tidak ter-reset ketika pemain berganti halaman/tab
const chatHistory = [
    { role: 'assistant', content: 'Halo Juragan! Ada yang bisa gua bantu hari ini? Mau gosip pasar gelap, analisis barang yang layak diserok, atau cara ngadepin rentenir Cap Badak? Tanya aja!' }
];

/**
 * Inisialisasi sistem antarmuka (UI) awal
 */
export function initUI() {
    console.log("[UI] Menginisialisasi komponen antarmuka...");
    
    // Pasang delegasi event click pada root element untuk performa maksimal
    const gameRoot = document.getElementById('game-root');
    if (!gameRoot) return;

    gameRoot.addEventListener('click', (e) => {
        // Navigasi Layar / Tab
        const navBtn = e.target.closest('[data-nav]');
        if (navBtn) {
            const screenTarget = navBtn.getAttribute('data-nav');
            renderScreen(screenTarget);
            return;
        }

        // Tombol Simpan API Key Groq
        const saveApiKeyBtn = e.target.closest('[data-action="save-api-key"]');
        if (saveApiKeyBtn) {
            const keyInput = document.getElementById('groq-api-key-input');
            if (keyInput && keyInput.value) {
                const isSaved = saveApiKey(keyInput.value);
                if (isSaved) {
                    showToast("API Key Groq berhasil disimpan!", "success");
                    renderScreen('chat');
                } else {
                    showToast("Gagal menyimpan API Key!", "error");
                }
            } else {
                showToast("Masukkan API Key terlebih dahulu!", "error");
            }
            return;
        }

        // Tombol Cabut / Hapus API Key
        const removeApiKeyBtn = e.target.closest('[data-action="remove-api-key"]');
        if (removeApiKeyBtn) {
            if (confirm("Apakah Anda yakin ingin menghapus API Key dari game ini?")) {
                removeApiKey();
                showToast("API Key dicabut!", "info");
                renderScreen('chat');
            }
            return;
        }

        // Tombol Kirim Chat ke AI
        const sendChatBtn = e.target.closest('[data-action="send-chat"]');
        if (sendChatBtn) {
            handleSendChat();
            return;
        }

        // Tombol Hari Berikutnya (Next Day)
        const nextDayBtn = e.target.closest('#btn-next-day');
        if (nextDayBtn) {
            handleNextDay();
            return;
        }

        // Tombol Beli Barang
        const buyBtn = e.target.closest('[data-action="buy"]');
        if (buyBtn) {
            const itemId = buyBtn.getAttribute('data-id');
            handleTransaction(itemId, 'buy');
            return;
        }

        // Tombol Jual Barang
        const sellBtn = e.target.closest('[data-action="sell"]');
        if (sellBtn) {
            const itemId = sellBtn.getAttribute('data-id');
            handleTransaction(itemId, 'sell');
            return;
        }

        // Tombol Beli Upgrade Toko
        const buyUpgradeBtn = e.target.closest('[data-action="buy-upgrade"]');
        if (buyUpgradeBtn) {
            const upgradeId = buyUpgradeBtn.getAttribute('data-id');
            if (confirm("Apakah Anda yakin ingin berinvestasi di upgrade ini?")) {
                const result = purchaseUpgrade(upgradeId);
                if (result.success) {
                    showToast(result.message, "success");
                    renderScreen(currentScreen);
                } else {
                    showToast(result.message, "error");
                }
            }
            return;
        }

        // Tombol Bayar Utang
        const payBtn = e.target.closest('[data-action="pay-debt"]');
        if (payBtn) {
            const amount = parseInt(payBtn.getAttribute('data-amount'), 10);
            handlePayDebt(amount);
            return;
        }

        // Tombol Reset Game
        const resetBtn = e.target.closest('#btn-reset-game');
        if (resetBtn) {
            if (confirm("Apakah Anda yakin ingin mengulang permainan dari hari ke-1? Semua progres akan hilang.")) {
                resetGame();
                showToast("Permainan direset!", "success");
                renderScreen('dashboard');
            }
            return;
        }
    });

    gameRoot.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.id === 'chat-input') {
            e.preventDefault();
            handleSendChat();
        }
    });
}

/**
 * Memproses pengiriman pesan dari pemain ke asisten AI
 */
async function handleSendChat() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;

    const userMessage = input.value.trim();
    input.value = ''; // Kosongkan kolom ketik segera demi responsivitas kilat

    // 1. Masukkan pesan pemain ke riwayat dan gambar ulang layar chat
    chatHistory.push({ role: 'user', content: userMessage });
    renderScreen('chat');
    scrollToBottom();

    // 2. Tampilkan status "mengetik..." agar UI terasa dinamis dan interaktif
    chatHistory.push({ role: 'assistant', content: '', isTyping: true });
    renderScreen('chat');
    scrollToBottom();

    try {
        // 3. Kirim pesan ke modul Groq Service
        const reply = await sendChatMessage(userMessage);

        // Hapus status mengetik, lalu masukkan jawaban nyata dari AI
        chatHistory.pop();
        chatHistory.push({ role: 'assistant', content: reply });
    } catch (error) {
        // Penanganan galat (Error Handling) jika API bermasalah
        chatHistory.pop();
        chatHistory.push({ 
            role: 'assistant', 
            content: `Aduh bos, ada masalah koneksi pas mau nanya si Bang El nih. Keterangan: ${error.message}. Coba cek kuota internet atau pasang ulang API Key lu ya!` 
        });
        showToast("AI gagal merespon!", "error");
    }

    renderScreen('chat');
    scrollToBottom();
}

/**
 * Menggulung jendela obrolan ke baris paling bawah secara otomatis
 */
function scrollToBottom() {
    const chatWindow = document.getElementById('chat-window');
    if (chatWindow) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

/**
 * Menangani siklus pergantian hari
 */
function handleNextDay() {
    const isSuccess = nextDay();
    if (isSuccess) {
        showToast(`Hari berganti! Sekarang Hari ${gameState.day}`, 'info');
        renderScreen(currentScreen);
    } else {
        // Skenario Akhir Permainan (Game Over / Tamat)
        handleGameOver();
    }
}

/**
 * Memproses akhir permainan setelah melewati batas waktu hari
 */
function handleGameOver() {
    const totalAssets = gameState.money - gameState.debt;
    const isWin = totalAssets > 50000000; // Menang jika kekayaan bersih > 50 Juta
    
    const gameRoot = document.getElementById('game-root');
    gameRoot.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full p-6 text-center bg-[#090d16] text-white">
            <div class="w-20 h-20 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-6 border border-amber-500/30">
                <span class="text-4xl">🏆</span>
            </div>
            <h2 class="text-3xl font-extrabold text-amber-400 mb-2">Simulasi Selesai!</h2>
            <p class="text-sm text-slate-400 mb-6 max-w-sm">Anda telah bertahan selama ${gameState.maxDays} hari di kerasnya pasar Palugada.</p>
            
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 w-full max-w-xs mb-8 space-y-3">
                <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Uang Tunai:</span>
                    <span class="font-bold text-emerald-400">Rp ${gameState.money.toLocaleString('id-ID')}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-slate-500">Sisa Utang:</span>
                    <span class="font-bold text-red-400">Rp ${gameState.debt.toLocaleString('id-ID')}</span>
                </div>
                <hr class="border-slate-800">
                <div class="flex justify-between text-base">
                    <span class="font-semibold text-slate-300">Kekayaan Bersih:</span>
                    <span class="font-extrabold ${totalAssets >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        Rp ${totalAssets.toLocaleString('id-ID')}
                    </span>
                </div>
            </div>

            <p class="text-lg font-bold mb-8 ${isWin ? 'text-emerald-400' : 'text-amber-500'}">
                ${isWin ? '🎉 Selamat! Anda sukses jadi Juragan Palugada!' : '💸 Usaha Anda bangkrut atau masih terjerat hutang!'}
            </p>

            <button id="btn-reset-game" class="w-full max-w-xs py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl transition duration-300 transform active:scale-95 shadow-lg shadow-amber-500/20">
                Main Lagi
            </button>
        </div>
    `;
}

/**
 * Logika dialog input kuantitas barang saat transaksi beli/jual
 */
function handleTransaction(itemId, type) {
    const qtyInput = prompt(`Masukkan jumlah unit yang ingin di-${type === 'buy' ? 'beli' : 'jual'}:`, "1");
    if (qtyInput === null) return;

    const kuantitas = parseInt(qtyInput, 10);
    if (isNaN(kuantitas) || kuantitas <= 0) {
        showToast("Jumlah unit tidak valid!", "error");
        return;
    }

    const result = type === 'buy' ? buyItem(itemId, kuantitas) : sellItem(itemId, kuantitas);
    
    if (result.success) {
        showToast(result.message, "success");
        renderScreen(currentScreen);
    } else {
        showToast(result.message, "error");
    }
}

/**
 * Logika pembayaran cicilan utang
 */
function handlePayDebt(amount) {
    const actualPayAmount = amount === -1 ? gameState.debt : amount;
    const result = payDebt(actualPayAmount);

    if (result.success) {
        showToast(result.message, "success");
        renderScreen(currentScreen);
    } else {
        showToast(result.message, "error");
    }
}

/**
 * Merender seluruh kerangka dan isi dari layar yang aktif
 */
export function renderScreen(screenId) {
    currentScreen = screenId;
    const gameRoot = document.getElementById('game-root');
    if (!gameRoot) return;

    // Bersihkan isi layar utama dan suntikkan layout dasar
    gameRoot.innerHTML = `
        <!-- Bagian Atas: Panel Header Status Finansial & Gudang -->
        ${renderHeader()}

        <!-- Bagian Tengah: Wadah konten utama dengan scrollbar tersembunyi -->
        <div class="flex-1 w-full overflow-y-auto px-4 py-2 scrollbar-none pb-24">
            ${renderActiveContent(screenId)}
        </div>

        <!-- Bagian Bawah: Navigasi Menu/Tab Utama -->
        ${renderNavigation()}

        <!-- Wadah Toast Notification -->
        <div id="toast-container" class="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex flex-col gap-2 w-11/12 max-w-xs"></div>
    `;

    if (screenId === 'chat') {
        setTimeout(scrollToBottom, 50);
    }
}

/**
 * Merender Tab Navigasi Menu Bawah
 */
function renderNavigation() {
    const tabs = [
        { id: 'dashboard', label: 'Dasbor', icon: '🏠' },
        { id: 'market', label: 'Pasar', icon: '🛒' },
        { id: 'warehouse', label: 'Gudang', icon: '📦' },
        { id: 'shop', label: 'Toko', icon: '🏢' },
        { id: 'loan', label: 'Utang', icon: '😈' },
        { id: 'chat', label: 'AI', icon: '💬' }
    ];

    return `
        <div class="absolute bottom-0 left-0 right-0 h-20 bg-[#0c1424]/95 backdrop-blur-md border-t border-slate-800/80 flex justify-around items-center px-2 pb-safe">
            ${tabs.map(tab => {
                const isActive = currentScreen === tab.id;
                return `
                    <button data-nav="${tab.id}" class="flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 ${isActive ? 'text-amber-400 bg-amber-400/10 border border-amber-500/20' : 'text-slate-500 hover:text-slate-300'}">
                        <span class="text-xl mb-0.5">${tab.icon}</span>
                        <span class="text-[10px] font-bold tracking-wide">${tab.label}</span>
                    </button>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Mengarahkan dan me-render konten yang tepat untuk setiap layar/tab
 */
function renderActiveContent(screenId) {
    switch (screenId) {
        case 'dashboard':
            return renderDashboard();
        case 'market':
            return renderMarket();
        case 'warehouse':
            return renderWarehouse();
        case 'shop':
            return renderShop();
        case 'loan':
            return renderLoan();
        case 'chat':
            return renderChat();
        default:
            return `<div class="p-4 text-center">Halaman tidak ditemukan.</div>`;
    }
}

/**
 * Render Header (Status Finansial)
 */
function renderHeader() {
    const spaceUsed = getUsedWarehouseSpace();
    return `
        <div class="glass-effect w-full px-5 py-4 pt-safe flex justify-between items-end border-b border-slate-800/80 z-10 sticky top-0">
            <div>
                <h2 class="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Hari ke-${gameState.day}/${gameState.maxDays}</h2>
                <div class="text-2xl font-black text-white neon-glow-emerald">
                    Rp ${gameState.money.toLocaleString('id-ID')}
                </div>
            </div>
            <div class="text-right">
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Kapasitas Gudang</span>
                <span class="text-sm font-bold ${spaceUsed >= gameState.warehouseCapacity ? 'text-red-400' : 'text-amber-400'}">
                    ${spaceUsed} / ${gameState.warehouseCapacity} Unit
                </span>
            </div>
        </div>
    `;
}

/**
 * Tampilan Halaman Dashboard (Beranda)
 */
function renderDashboard() {
    const netWorth = gameState.money - gameState.debt;
    return `
        <div class="pt-2 space-y-4 animate-page-enter">
            <!-- Kartu Status Keuangan -->
            <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <span class="text-[10px] text-slate-500 font-bold uppercase block mb-1">Total Utang</span>
                    <span class="text-sm font-bold text-red-400">Rp ${gameState.debt.toLocaleString('id-ID')}</span>
                </div>
                <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <span class="text-[10px] text-slate-500 font-bold uppercase block mb-1">Kekayaan Bersih</span>
                    <span class="text-sm font-bold ${netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}">Rp ${netWorth.toLocaleString('id-ID')}</span>
                </div>
            </div>

            <!-- Kartu Selamat Datang / Target -->
            <div class="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-4">
                <h3 class="text-sm font-bold text-indigo-400 mb-1">Misi Bulan Ini 💼</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-3">Lunasilah semua hutang Anda kepada rentenir sebesar Rp 10.000.000 sebelum Hari ke-30 berakhir. Dapatkan profit sebanyak-banyaknya!</p>
                <div class="flex justify-between text-xs font-semibold text-slate-300 bg-black/30 p-2 rounded-lg">
                    <span>Sisa Waktu: ${gameState.maxDays - gameState.day} Hari</span>
                    <span>Reputasi: ${gameState.reputation}/100</span>
                </div>
            </div>

            <!-- Tombol Aksi Akhir Hari -->
            <button id="btn-next-day" class="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-amber-500/10 transition duration-300 active:scale-95 flex items-center justify-center gap-2">
                <span>💤</span>
                <span>Tidur & Lewati Hari (Lanjut Hari ${gameState.day + 1})</span>
            </button>

            <!-- Tombol Pengaturan Darurat -->
            <div class="pt-4 flex justify-center">
                <button id="btn-reset-game" class="text-xs text-red-500/70 hover:text-red-400 underline font-medium transition">
                    Mulai Ulang / Reset Game
                </button>
            </div>
        </div>
    `;
}

/**
 * Tampilan Halaman Pasar
 */
function renderMarket() {
    return `
        <div class="pt-2 space-y-4 animate-page-enter">
            <div class="flex justify-between items-center">
                <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Komoditas Pasar Hari Ini</h3>
                <span class="text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 font-bold">Terupdate 🟢</span>
            </div>

            <div class="space-y-3">
                ${gameState.marketPrices.map(item => {
                    const trendIcon = item.trend === 'naik' ? '📈' : '📉';
                    const trendColor = item.trend === 'naik' ? 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' : 'text-rose-400 bg-rose-400/5 border-rose-400/20';
                    const ownedInInventory = gameState.inventory.find(i => i.id === item.id);
                    const amountOwned = ownedInInventory ? ownedInInventory.jumlah : 0;

                    return `
                        <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 hover:border-slate-700/80 transition duration-200">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-slate-100 text-sm sm:text-base">${item.nama}</h4>
                                    <span class="text-[10px] text-slate-500 font-semibold uppercase">Beban: ${item.berat} Slot/Unit</span>
                                </div>
                                <span class="text-xs font-bold px-2 py-1 rounded-lg border ${trendColor}">
                                    ${trendIcon} ${item.trend.toUpperCase()}
                                </span>
                            </div>

                            <div class="flex justify-between items-end border-t border-slate-800/60 pt-3">
                                <div>
                                    <span class="text-[10px] text-slate-500 uppercase tracking-wider block">Harga Pasar</span>
                                    <span class="text-base font-extrabold text-white">Rp ${item.harga.toLocaleString('id-ID')}</span>
                                    <span class="text-[10px] text-slate-400 block mt-0.5">Stok Gudang Anda: <strong class="text-amber-400">${amountOwned} unit</strong></span>
                                </div>
                                <div class="flex gap-2">
                                    ${amountOwned > 0 ? `
                                        <button data-id="${item.id}" data-action="sell" class="px-4 py-2 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-400 font-bold text-xs rounded-xl transition duration-150 active:scale-95">
                                            Jual
                                        </button>
                                    ` : ''}
                                    <button data-id="${item.id}" data-action="buy" class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 transition duration-150 active:scale-95">
                                        Beli
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Tampilan Halaman Gudang
 */
function renderWarehouse() {
    if (gameState.inventory.length === 0) {
        return `
            <div class="flex flex-col items-center justify-center py-16 text-center space-y-4 pt-8 animate-page-enter">
                <span class="text-5xl">📦</span>
                <p class="text-slate-400 text-sm max-w-[200px]">Gudang Anda kosong melompong. Silakan belanja barang di pasar!</p>
                <button data-nav="market" class="px-4 py-2 bg-amber-400/10 text-amber-400 border border-amber-400/20 font-bold text-xs rounded-xl hover:bg-amber-400/20 transition">
                    Belanja Sekarang
                </button>
            </div>
        `;
    }

    return `
        <div class="pt-2 space-y-4 animate-page-enter">
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventaris Gudang Aktif</h3>
            
            <div class="space-y-3">
                ${gameState.inventory.map(item => {
                    const currentMarketItem = gameState.marketPrices.find(m => m.id === item.id);
                    const currentMarketPrice = currentMarketItem ? currentMarketItem.harga : 0;
                    const profitMargin = currentMarketPrice - item.hargaBeli;
                    const totalAssetWeight = item.berat * item.jumlah;

                    return `
                        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                            <div class="flex justify-between items-start">
                                <div>
                                    <h4 class="font-bold text-slate-100 text-sm">${item.nama}</h4>
                                    <span class="text-[10px] text-slate-500 font-semibold uppercase">Total Beban: ${totalAssetWeight} Slot</span>
                                </div>
                                <span class="text-xs font-bold text-amber-400 bg-amber-400/5 border border-amber-400/10 px-2 py-0.5 rounded-md">
                                    Stok: ${item.jumlah} Unit
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-3 text-xs">
                                <div>
                                    <span class="text-slate-500 block">Harga Rata-Rata</span>
                                    <span class="font-semibold text-slate-300">Rp ${item.hargaBeli.toLocaleString('id-ID')}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block">Harga Pasar Saat Ini</span>
                                    <span class="font-semibold text-slate-300">Rp ${currentMarketPrice.toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            <div class="flex justify-between items-center bg-black/30 p-2.5 rounded-xl text-xs">
                                <div>
                                    <span class="text-slate-500">Estimasi Margin Keuntungan:</span>
                                    <span class="font-bold block ${profitMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
                                        ${profitMargin >= 0 ? '+' : ''}Rp ${profitMargin.toLocaleString('id-ID')} / unit
                                    </span>
                                </div>
                                <button data-id="${item.id}" data-action="sell" class="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl transition duration-150 active:scale-95">
                                    Jual Sekarang
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Tampilan Halaman Toko (Shop Upgrades)
 */
function renderShop() {
    return `
        <div class="pt-2 space-y-4 animate-page-enter">
            <div class="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/20 rounded-2xl p-4 text-center">
                <span class="text-4xl block mb-2">📈</span>
                <h4 class="font-bold text-purple-400 text-sm mb-1">Pusat Ekspansi Bisnis</h4>
                <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">Tingkatkan aset, beli asuransi, dan perluas jangkauan Anda di pasar untuk memaksimalkan cuan harian.</p>
            </div>

            <div class="space-y-3">
                ${SHOP_UPGRADES.map(upgrade => {
                    // Logika pengecekan kemampuan beli
                    const canBuy = gameState.money >= upgrade.harga;
                    
                    // Logika pengecekan kepemilikan
                    let owned = false;
                    if (upgrade.tipe === 'kapasitas' && gameState.warehouseCapacity >= upgrade.nilai) owned = true;
                    if (upgrade.tipe === 'reputasi' && gameState.reputation >= 100 && upgrade.nilai > 0) owned = true;
                    if (upgrade.tipe === 'asuransi' && gameState.hasInsurance) owned = true;
                    if (upgrade.tipe === 'potongan_bunga' && gameState.hasTaxConsultant) owned = true;

                    return `
                        <div class="bg-slate-900/60 border ${owned ? 'border-emerald-500/30' : 'border-slate-800'} rounded-2xl p-4 flex flex-col gap-3 transition">
                            <div class="flex gap-3 items-start">
                                <div class="text-3xl bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                                    ${upgrade.ikon}
                                </div>
                                <div class="flex-1">
                                    <h4 class="font-bold text-slate-100 text-sm mb-0.5">${upgrade.nama}</h4>
                                    <p class="text-[10px] text-slate-400 leading-relaxed">${upgrade.deskripsi}</p>
                                </div>
                            </div>

                            <div class="flex justify-between items-center border-t border-slate-800/60 pt-3">
                                <div>
                                    <span class="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Biaya Investasi</span>
                                    <span class="text-sm font-extrabold ${canBuy && !owned ? 'text-amber-400' : 'text-slate-500'}">Rp ${upgrade.harga.toLocaleString('id-ID')}</span>
                                </div>
                                
                                ${owned ? `
                                    <span class="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 font-bold text-[10px] rounded-lg border border-emerald-500/20 flex items-center gap-1">
                                        <span>✓</span> Dimiliki
                                    </span>
                                ` : `
                                    <button data-id="${upgrade.id}" data-action="buy-upgrade" class="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:grayscale text-slate-950 font-bold text-xs rounded-xl shadow-md transition duration-150 active:scale-95" ${!canBuy ? 'disabled' : ''}>
                                        Beli Sekarang
                                    </button>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Tampilan Halaman Rentenir (Manajemen Hutang)
 */
function renderLoan() {
    return `
        <div class="pt-2 space-y-4 animate-page-enter">
            <div class="bg-gradient-to-br from-rose-950/40 to-slate-900 border border-rose-500/20 rounded-2xl p-4 text-center">
                <span class="text-4xl block mb-2">👿</span>
                <h4 class="font-bold text-rose-400 text-sm mb-1">Rentenir Cap Badak</h4>
                <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto mb-3">"Utangmu terus membengkak sebesar 1% setiap malamnya akibat bunga. Bayar sebelum waktu habis atau tokomu kusegel!"</p>
                <span class="inline-block text-xs font-bold text-red-400 bg-red-400/5 border border-red-400/10 px-3 py-1 rounded-full">
                    Sisa Utang: Rp ${gameState.debt.toLocaleString('id-ID')}
                </span>
            </div>

            ${gameState.debt > 0 ? `
                <div class="space-y-3">
                    <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Opsi Pembayaran Utang</h3>
                    
                    <div class="grid grid-cols-2 gap-3">
                        <button data-action="pay-debt" data-amount="500000" class="p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-emerald-400 transition text-center">
                            Bayar Rp 500.000
                        </button>
                        <button data-action="pay-debt" data-amount="1000000" class="p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-emerald-400 transition text-center">
                            Bayar Rp 1.000.000
                        </button>
                        <button data-action="pay-debt" data-amount="5000000" class="p-3 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-bold text-emerald-400 transition text-center">
                            Bayar Rp 5.000.000
                        </button>
                        <button data-action="pay-debt" data-amount="-1" class="p-3 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl text-xs font-bold text-emerald-400 transition text-center col-span-2">
                            Lunasin Semua Sisa Utang
                        </button>
                    </div>
                </div>
            ` : `
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center">
                    <span class="text-4xl block mb-2">🎉</span>
                    <h4 class="font-bold text-emerald-400 text-sm mb-1">Utang Anda Telah Lunas!</h4>
                    <p class="text-xs text-slate-300 leading-relaxed">Selamat! Anda berhasil melepaskan diri dari kejaran rentenir. Sekarang, fokuslah mengumpulkan kekayaan sebanyak-banyaknya hingga hari terakhir!</p>
                </div>
            `}
        </div>
    `;
}

/**
 * Tampilan Halaman Obrolan AI (Asisten Finansial & Gosip Pasar)
 */
function renderChat() {
    const apiKey = getApiKey();

    // Skenario Awal: Pemain belum memasang API Key Groq
    if (!apiKey) {
        return `
            <div class="pt-2 space-y-4 animate-page-enter">
                <div class="bg-gradient-to-br from-amber-500/10 to-slate-900 border border-amber-500/20 rounded-2xl p-5 text-center">
                    <span class="text-4xl block mb-2.5">🤖</span>
                    <h3 class="font-extrabold text-amber-400 text-base mb-1.5">Pasang Otak Asisten AI</h3>
                    <p class="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto mb-4">
                        Untuk mengaktifkan asisten AI 'Bang El' yang bisa membaca sisa uang, isi gudang, dan fluktuasi harga pasar secara real-time, masukkan API Key Groq Cloud Anda.
                    </p>
                    <a href="https://console.groq.com/" target="_blank" class="inline-block text-xs text-amber-300 underline font-semibold mb-5 hover:text-amber-200">
                        Ambil API Key Gratis di console.groq.com ↗
                    </a>
                    
                    <div class="space-y-3 text-left">
                        <label class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Masukkan Groq API Key:</label>
                        <input type="password" id="groq-api-key-input" placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" class="w-full bg-black/40 border border-slate-800 focus:border-amber-500/50 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none transition duration-200">
                        <button data-action="save-api-key" class="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs rounded-xl transition duration-150 active:scale-95 shadow-md shadow-amber-500/10">
                            Aktifkan Modul AI
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Skenario Utama: API Key sudah siap, tampilkan antarmuka percakapan aktif
    return `
        <div class="pt-2 flex flex-col h-[calc(100vh-230px)] animate-page-enter">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🕶️</span>
                    <div>
                        <h4 class="font-bold text-slate-200 text-xs sm:text-sm">Bang El</h4>
                        <span class="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online (Siap Cuan)
                        </span>
                    </div>
                </div>
                <button data-action="remove-api-key" class="text-[10px] text-red-400/80 hover:text-red-400 font-semibold underline transition">
                    Cabut API Key
                </button>
            </div>

            <!-- Jendela Chat -->
            <div id="chat-window" class="flex-1 bg-black/40 border border-slate-800/60 rounded-2xl p-3.5 overflow-y-auto space-y-3.5 mb-3 scrollbar-none">
                ${chatHistory.map(msg => {
                    const isUser = msg.role === 'user';
                    const avatar = isUser ? '👤' : '🕶️';
                    const name = isUser ? 'Anda' : 'Bang El';
                    const bubbleBg = isUser ? 'bg-indigo-600/25 border-indigo-500/20 text-slate-200' : 'bg-slate-800/40 border-slate-800 text-slate-300';
                    const alignment = isUser ? 'flex-row-reverse' : '';

                    // Layout gelembung saat AI sedang mengetik
                    if (msg.isTyping) {
                        return `
                            <div class="flex gap-2.5 items-start">
                                <div class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs">
                                    🕶️
                                </div>
                                <div class="flex-1 space-y-0.5">
                                    <span class="text-[10px] text-slate-500 font-bold uppercase">Bang El</span>
                                    <div class="inline-block p-3 rounded-2xl rounded-tl-none border bg-slate-800/40 border-slate-800 text-xs">
                                        <div class="flex gap-1.5 items-center py-1">
                                            <div class="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay: 0s"></div>
                                            <div class="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay: 0.15s"></div>
                                            <div class="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style="animation-delay: 0.3s"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }

                    // Layout gelembung pesan normal
                    return `
                        <div class="flex gap-2.5 items-start ${alignment}">
                            <div class="w-7 h-7 rounded-full ${isUser ? 'bg-indigo-900/40 border-indigo-500/20' : 'bg-slate-800 border-slate-700'} border flex items-center justify-center text-xs flex-shrink-0">
                                ${avatar}
                            </div>
                            <div class="flex-1 space-y-0.5 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}">
                                <span class="text-[10px] text-slate-500 font-bold uppercase block">${name}</span>
                                <div class="inline-block p-3 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'} border ${bubbleBg} text-xs text-left leading-relaxed">
                                    ${msg.content}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Input Chat -->
            <div class="flex gap-2">
                <input type="text" id="chat-input" placeholder="Tanya apa aja ke Bang El..." class="flex-1 bg-slate-900/60 border border-slate-800 focus:border-amber-500/40 rounded-xl px-4 py-3 text-xs text-slate-200 outline-none transition duration-150">
                <button data-action="send-chat" class="w-11 h-11 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center transition duration-150 active:scale-95 shadow-md shadow-amber-500/10">
                    🚀
                </button>
            </div>
        </div>
    `;
}

/**
 * Menampilkan pesan melayang singkat di layar
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2.5`;
    
    // Penentuan tema toast berdasarkan status
    if (type === 'success') {
        toast.className += ' bg-emerald-950/90 border-emerald-500/30 text-emerald-300';
        toast.innerHTML = `<span>✅</span> <span>${message}</span>`;
    } else if (type === 'error') {
        toast.className += ' bg-rose-950/90 border-rose-500/30 text-rose-300';
        toast.innerHTML = `<span>❌</span> <span>${message}</span>`;
    } else if (type === 'info') {
        toast.className += ' bg-blue-950/90 border-blue-500/30 text-blue-300';
        toast.innerHTML = `<span>ℹ️</span> <span>${message}</span>`;
    }

    container.appendChild(toast);

    // Animasi masuk
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    // Otomatis hilangkan toast setelah 3.5 detik
    setTimeout(() => {
        toast.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}