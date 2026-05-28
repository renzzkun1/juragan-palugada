/**
 * JURAGAN PALUGADA SIMULATOR
 * Core Game Engine
 * File ini mengelola state game, kalkulasi harga, siklus hari, dan save/load data.
 */

// State Game Global (Single Source of Truth)
export const gameState = {
    money: 5000000,        // Modal awal Rp 5.000.000
    debt: 10000000,        // Hutang awal Rp 10.000.000
    day: 1,                // Hari pertama
    maxDays: 30,           // Batas waktu game (30 hari)
    warehouseCapacity: 50, // Kapasitas maksimum gudang (unit)
    inventory: [],         // Barang yang sedang disimpan
    marketPrices: [],      // Harga barang hari ini
    reputation: 50,        // Reputasi awal (0-100)
    currentEvent: null,    // Event pasar yang sedang aktif
    hasInsurance: false,   // Status asuransi
    hasTaxConsultant: false, // Status konsultan pajak
    eventProtectionDays: 0, // Sisa hari perlindungan event
    interestDiscount: 0    // Diskon bunga dari konsultan pajak
};

import { buyUpgrade as processBuyUpgrade } from '../modules/shop.js';

// Database barang dasar dengan rentang harga normal
export const ITEM_DATABASE = [
    { id: 'beras', nama: 'Beras Pandan Wangi', hargaMin: 12000, hargaMax: 18000, baseHarga: 15000, berat: 1 },
    { id: 'minyak', nama: 'Minyak Goreng Premium', hargaMin: 14000, hargaMax: 22000, baseHarga: 18000, berat: 1 },
    { id: 'semen', nama: 'Semen Tiga Roda', hargaMin: 55000, hargaMax: 75000, baseHarga: 65000, berat: 2 },
    { id: 'smartphone', nama: 'Smartphone Refurbished', hargaMin: 800000, hargaMax: 1500000, baseHarga: 1100000, berat: 3 },
    { id: 'laptop', nama: 'Laptop Bekas Kantor', hargaMin: 2500000, hargaMax: 4500000, baseHarga: 3200000, berat: 5 }
];

// Daftar event pasar acak yang memengaruhi harga
export const MARKET_EVENTS = [
    { id: 'inflasi', nama: 'Inflasi Sembako', deskripsi: 'Harga beras dan minyak goreng melonjak naik akibat kelangkaan!', target: ['beras', 'minyak'], multiplier: 1.8 },
    { id: 'panen', nama: 'Panen Raya', deskripsi: 'Panen raya melimpah! Harga beras turun drastis.', target: ['beras'], multiplier: 0.5 },
    { id: 'tech_crash', nama: 'Subsidi Elektronik', deskripsi: 'Pasokan gawai membludak, harga laptop dan smartphone anjlok.', target: ['laptop', 'smartphone'], multiplier: 0.6 },
    { id: 'pembangunan', nama: 'Proyek Infrastruktur', deskripsi: 'Pembangunan kota besar sedang gencar, semen dicari di mana-mana!', target: ['semen'], multiplier: 1.6 }
];

/**
 * Inisialisasi Engine Utama
 */
export async function initEngine() {
    console.log("[Engine] Menyiapkan sistem permainan...");
    
    // Coba memuat data simpanan terlebih dahulu
    const hasSave = loadGame();
    
    if (!hasSave) {
        // Jika tidak ada save game, racik harga pasar awal untuk hari ke-1
        generateMarketPrices();
    }
}

/**
 * Mengacak harga barang berdasarkan database dan event yang sedang aktif
 */
export function generateMarketPrices() {
    const isEventDay = Math.random() < 0.3;
    let activeEvent = null;

    if (isEventDay) {
        const randomIndex = Math.floor(Math.random() * MARKET_EVENTS.length);
        activeEvent = MARKET_EVENTS[randomIndex];
        console.log(`[Engine] Event aktif hari ini: ${activeEvent.nama}`);
    }

    gameState.currentEvent = activeEvent;

    gameState.marketPrices = ITEM_DATABASE.map(item => {
        let min = item.hargaMin;
        let max = item.hargaMax;

        if (activeEvent && activeEvent.target.includes(item.id)) {
            min = Math.round(min * activeEvent.multiplier);
            max = Math.round(max * activeEvent.multiplier);
        }

        const randomHarga = Math.floor(Math.random() * (max - min + 1)) + min;
        const finalHarga = Math.round(randomHarga / 100) * 100;

        return {
            id: item.id,
            nama: item.nama,
            harga: finalHarga,
            berat: item.berat,
            trend: randomHarga > item.baseHarga ? 'naik' : 'turun'
        };
    });
}

/**
 * Melangkah ke hari berikutnya
 */
export function nextDay() {
    if (gameState.day >= gameState.maxDays) {
        return false; 
    }

    gameState.day += 1;
    
    if (gameState.debt > 0) {
        gameState.debt = Math.round(gameState.debt * 1.01);
    }

    generateMarketPrices();
    saveGame();
    return true;
}

/**
 * Hitung kapasitas gudang terpakai
 */
export function getUsedWarehouseSpace() {
    return gameState.inventory.reduce((total, item) => total + (item.berat * item.jumlah), 0);
}

/**
 * Beli Barang
 */
export function buyItem(itemId, kuantitas) {
    const marketItem = gameState.marketPrices.find(i => i.id === itemId);
    if (!marketItem) return { success: false, message: "Barang tidak ditemukan di pasar!" };

    const totalHarga = marketItem.harga * kuantitas;
    const totalBerat = marketItem.berat * kuantitas;
    const sisaGudang = gameState.warehouseCapacity - getUsedWarehouseSpace();

    if (gameState.money < totalHarga) {
        return { success: false, message: "Uang Anda tidak cukup!" };
    }

    if (sisaGudang < totalBerat) {
        return { success: false, message: "Kapasitas gudang tidak muat!" };
    }

    gameState.money -= totalHarga;

    const inventoryItem = gameState.inventory.find(i => i.id === itemId);
    if (inventoryItem) {
        const totalBiayaLama = inventoryItem.hargaBeli * inventoryItem.jumlah;
        const totalBiayaBaru = totalHarga;
        inventoryItem.jumlah += kuantitas;
        inventoryItem.hargaBeli = Math.round((totalBiayaLama + totalBiayaBaru) / inventoryItem.jumlah);
    } else {
        gameState.inventory.push({
            id: itemId,
            nama: marketItem.nama,
            jumlah: kuantitas,
            hargaBeli: marketItem.harga,
            berat: marketItem.berat
        });
    }

    saveGame();
    return { success: true, message: `Berhasil membeli ${kuantitas} unit ${marketItem.nama}!` };
}

/**
 * Jual Barang
 */
export function sellItem(itemId, kuantitas) {
    const inventoryItem = gameState.inventory.find(i => i.id === itemId);
    if (!inventoryItem || inventoryItem.jumlah < kuantitas) {
        return { success: false, message: "Stok barang di gudang tidak mencukupi!" };
    }

    const marketItem = gameState.marketPrices.find(i => i.id === itemId);
    if (!marketItem) return { success: false, message: "Barang tidak sedang diminati di pasar hari ini!" };

    const totalPendapatan = marketItem.harga * kuantitas;

    gameState.money += totalPendapatan;
    inventoryItem.jumlah -= kuantitas;

    if (inventoryItem.jumlah <= 0) {
        gameState.inventory = gameState.inventory.filter(i => i.id !== itemId);
    }

    saveGame();
    return { success: true, message: `Berhasil menjual ${kuantitas} unit ${marketItem.nama}!` };
}

/**
 * Bayar utang
 */
export function payDebt(jumlah) {
    if (gameState.money < jumlah) {
        return { success: false, message: "Uang tunai Anda tidak mencukupi!" };
    }
    if (jumlah > gameState.debt) {
        jumlah = gameState.debt;
    }

    gameState.money -= jumlah;
    gameState.debt -= jumlah;
    
    saveGame();
    return { success: true, message: `Berhasil membayar utang sebesar Rp ${jumlah.toLocaleString('id-ID')}!` };
}

/**
 * Beli Peningkatan Bisnis (Upgrade)
 */
export function purchaseUpgrade(upgradeId) {
    const result = processBuyUpgrade(gameState, upgradeId);
    if (result.success) {
        saveGame();
    }
    return result;
}

/**
 * Save Game
 */
export function saveGame() {
    try {
        localStorage.setItem('juragan_palugada_save', JSON.stringify(gameState));
        console.log("[Engine] Progress permainan disimpan.");
    } catch (e) {
        console.error("[Engine] Gagal menyimpan progres:", e);
    }
}

/**
 * Load Game
 */
export function loadGame() {
    try {
        const savedData = localStorage.getItem('juragan_palugada_save');
        if (savedData) {
            const parsed = JSON.parse(savedData);
            Object.assign(gameState, parsed);
            console.log("[Engine] Berhasil memuat data permainan lama (Day " + gameState.day + ")");
            return true;
        }
    } catch (e) {
        console.error("[Engine] Error saat memuat data simpanan:", e);
    }
    return false;
}

/**
 * Reset Game
 */
export function resetGame() {
    localStorage.removeItem('juragan_palugada_save');
    gameState.money = 5000000;
    gameState.debt = 10000000;
    gameState.day = 1;
    gameState.inventory = [];
    gameState.reputation = 50;
    gameState.currentEvent = null;
    generateMarketPrices();
}