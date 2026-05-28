/**
 * JURAGAN PALUGADA SIMULATOR
 * Module: Shop Upgrades
 * Mengelola peningkatan kapasitas bisnis, reputasi, perlindungan asuransi, dan sistem pengeluaran biaya modal tambahan.
 */

// Daftar upgrade yang tersedia untuk dibeli oleh Juragan dengan opsi yang lebih komprehensif
export const SHOP_UPGRADES = [
    {
        id: 'gudang_medium',
        nama: 'Sewa Ruko Samping',
        deskripsi: 'Memperluas kapasitas penyimpanan barang agar bisa menampung muatan lebih banyak.',
        tipe: 'kapasitas',
        nilai: 100, // Menjadi 100 unit
        harga: 2500000, // Rp 2.500.000
        ikon: '🏢'
    },
    {
        id: 'gudang_large',
        nama: 'Gedung Gudang Kontainer',
        deskripsi: 'Sewa lahan industri kontainer besar untuk melipatgandakan ruang penyimpanan.',
        tipe: 'kapasitas',
        nilai: 250, // Menjadi 250 unit
        harga: 7500000, // Rp 7.500.000
        ikon: '🏭'
    },
    {
        id: 'gudang_mega',
        nama: 'Gudang Pusat Logistik Swasta',
        deskripsi: 'Puncak kejayaan penyimpanan logistik. Muat apa saja tanpa takut kepenuhan.',
        tipe: 'kapasitas',
        nilai: 600, // Menjadi 600 unit
        harga: 18000000, // Rp 18.000.000
        ikon: '🏰'
    },
    {
        id: 'pasang_iklan',
        nama: 'Promosi Baliho Kota',
        deskripsi: 'Pasang wajah Juragan di simpang jalan utama kota untuk menaikkan reputasi secara instan (+20 reputasi).',
        tipe: 'reputasi',
        nilai: 20, // +20 reputasi
        harga: 1200000, // Rp 1.200.000
        ikon: '📢'
    },
    {
        id: 'sertifikasi_bisnis',
        nama: 'Sertifikasi ISO 9001',
        deskripsi: 'Mendapatkan pengakuan formal sebagai pebisnis elit. Meningkatkan reputasi besar-besaran (+40 reputasi).',
        tipe: 'reputasi',
        nilai: 40,
        harga: 3500000,
        ikon: '📜'
    },
    {
        id: 'koneksi_pasar_gelap',
        nama: 'Koneksi Pasar Gelap',
        deskripsi: 'Membuka akses orang dalam. Mencegah Anda terkena event pasar negatif (harga anjlok/kelangkaan) untuk 7 hari ke depan.',
        tipe: 'perlindungan_event',
        nilai: 7, // Melindungi selama 7 hari
        harga: 5000000, // Rp 5.000.000
        ikon: '🕶️'
    },
    {
        id: 'asuransi_kebakaran',
        nama: 'Asuransi Kebakaran & Pencurian',
        deskripsi: 'Memberikan perlindungan penuh. Jika terjadi event sial (pencurian/kebakaran gudang), kerugian Anda akan diganti 100%.',
        tipe: 'asuransi',
        nilai: 1, // Status aktif = 1 (true)
        harga: 3000000, // Rp 3.000.000
        ikon: '🧯'
    },
    {
        id: 'konsultan_pajak',
        nama: 'Jasa Konsultan Pajak Handal',
        deskripsi: 'Mengurangi beban bunga harian dari rentenir sebesar 0.5% secara permanen (sisa hutang lebih lambat membesar).',
        tipe: 'potongan_bunga',
        nilai: 0.5, // Potongan bunga
        harga: 8500000, // Rp 8.500.000
        ikon: '💼'
    }
];

/**
 * Memeriksa apakah pemain memenuhi kriteria untuk membeli suatu peningkatan
 * @param {Object} gameState - State aktif saat ini
 * @param {string} upgradeId - ID peningkatan yang ingin dibeli
 * @returns {Object} Hasil kelayakan pembelian berupa status boolean dan pesan teks
 */
export function canPurchaseUpgrade(gameState, upgradeId) {
    const upgrade = SHOP_UPGRADES.find(u => u.id === upgradeId);
    
    if (!upgrade) {
        return { success: false, message: "Upgrade tidak terdaftar di daftar toko!" };
    }

    // Periksa apakah uang mencukupi
    if (gameState.money < upgrade.harga) {
        return { success: false, message: "Aduh Bos, uang tunai Anda tidak mencukupi untuk serok upgrade ini!" };
    }

    // Cegah penurunan upgrade (misalnya kapasitas gudang sekarang 250, lalu membeli upgrade kapasitas 100)
    if (upgrade.tipe === 'kapasitas' && gameState.warehouseCapacity >= upgrade.nilai) {
        return { success: false, message: "Gudang Anda saat ini sudah setara atau lebih luas dari properti ini!" };
    }

    // Cegah pembelian reputasi jika reputasi sudah maksimal (100)
    if (upgrade.tipe === 'reputasi' && gameState.reputation >= 100) {
        return { success: false, message: "Reputasi Anda sudah berada di puncak kejayaan (100)!" };
    }

    // Cegah pembelian asuransi atau fitur permanen yang sudah aktif/dimiliki
    if (upgrade.tipe === 'asuransi' && gameState.hasInsurance) {
        return { success: false, message: "Polis asuransi Anda masih aktif dan berlaku penuh!" };
    }

    if (upgrade.tipe === 'potongan_bunga' && gameState.hasTaxConsultant) {
        return { success: false, message: "Anda sudah mempekerjakan konsultan pajak terbaik di kota!" };
    }

    // Perlindungan event ditumpuk jika dibeli lagi
    // Tidak ada pencegahan khusus untuk perlindungan_event kecuali uangnya cukup

    return { success: true, upgrade: upgrade };
}

/**
 * Memproses transaksi pembelian upgrade
 * @param {Object} gameState - State aktif saat ini yang akan diubah secara langsung
 * @param {string} upgradeId - ID peningkatan yang dibeli
 * @returns {Object} Hasil akhir proses pembelian
 */
export function buyUpgrade(gameState, upgradeId) {
    const check = canPurchaseUpgrade(gameState, upgradeId);
    
    if (!check.success) {
        return check;
    }

    const upgrade = check.upgrade;
    let effectMessage = "";

    // Kurangi kas keuangan pemain
    gameState.money -= upgrade.harga;

    // Aplikasikan efek berdasarkan tipe peningkatannya
    switch (upgrade.tipe) {
        case 'kapasitas':
            gameState.warehouseCapacity = upgrade.nilai;
            effectMessage = `Kapasitas gudang Anda meluas menjadi ${upgrade.nilai} unit!`;
            break;
        case 'reputasi':
            gameState.reputation = Math.min(100, gameState.reputation + upgrade.nilai);
            effectMessage = `Reputasi bisnis Anda meroket sebesar +${upgrade.nilai} poin!`;
            break;
        case 'perlindungan_event':
            // Jika sudah ada perlindungan, tambahkan harinya. Jika belum, setel dari nilai awalnya.
            gameState.eventProtectionDays = (gameState.eventProtectionDays || 0) + upgrade.nilai;
            effectMessage = `Anda aman dari gejolak pasar negatif selama ${upgrade.nilai} hari ke depan!`;
            break;
        case 'asuransi':
            gameState.hasInsurance = true;
            effectMessage = `Gudang Anda kini diasuransikan penuh terhadap bencana!`;
            break;
        case 'potongan_bunga':
            gameState.hasTaxConsultant = true;
            // Menyimpan besaran diskon bunga di state, nantinya diakses oleh engine utama (engine.js) saat pergantian hari
            gameState.interestDiscount = upgrade.nilai; 
            effectMessage = `Konsultan pajak berhasil menekan laju bunga harian rentenir!`;
            break;
        default:
            effectMessage = `Upgrade ${upgrade.nama} berhasil diaktifkan!`;
    }

    return {
        success: true,
        message: `Transaksi sukses Bos! ${effectMessage}`
    };
}