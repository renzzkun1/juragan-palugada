/**
 * JURAGAN PALUGADA SIMULATOR
 * Module: Inventory
 * Mengelola logika inventaris, penghitungan ruang gudang, dan HPP (Harga Pokok Penjualan).
 */

/**
 * Menghitung total kapasitas gudang yang terpakai berdasarkan berat barang
 * @param {Array} inventory - Array inventaris dari gameState
 * @returns {number} Total slot terpakai
 */
export function calculateUsedSpace(inventory) {
    if (!inventory || !Array.isArray(inventory)) return 0;
    return inventory.reduce((total, item) => total + (item.berat * item.jumlah), 0);
}

/**
 * Memeriksa apakah barang baru muat dimasukkan ke dalam gudang
 * @param {Array} inventory - Array inventaris saat ini
 * @param {number} totalBeratBaru - Berat total barang yang ingin dimasukkan
 * @param {number} maxCapacity - Kapasitas maksimal gudang
 * @returns {boolean} True jika muat, False jika tidak
 */
export function hasEnoughSpace(inventory, totalBeratBaru, maxCapacity) {
    const usedSpace = calculateUsedSpace(inventory);
    return (usedSpace + totalBeratBaru) <= maxCapacity;
}

/**
 * Menambahkan barang ke dalam inventaris dan menghitung ulang harga beli rata-rata (HPP)
 * @param {Array} inventory - Array inventaris yang akan dimodifikasi
 * @param {Object} itemDetail - Detail barang dari pasar (id, nama, berat, harga)
 * @param {number} kuantitas - Jumlah barang yang dibeli
 * @returns {Array} Inventaris yang sudah diperbarui
 */
export function addCargo(inventory, itemDetail, kuantitas) {
    const existingItem = inventory.find(i => i.id === itemDetail.id);
    
    if (existingItem) {
        // Rumus HPP (Harga Pokok Penjualan) / Average Cost
        const totalBiayaLama = existingItem.hargaBeli * existingItem.jumlah;
        const totalBiayaBaru = itemDetail.harga * kuantitas;
        existingItem.jumlah += kuantitas;
        existingItem.hargaBeli = Math.round((totalBiayaLama + totalBiayaBaru) / existingItem.jumlah);
    } else {
        inventory.push({
            id: itemDetail.id,
            nama: itemDetail.nama,
            jumlah: kuantitas,
            hargaBeli: itemDetail.harga,
            berat: itemDetail.berat
        });
    }
    return inventory;
}

/**
 * Mengurangi barang dari inventaris saat dijual
 * @param {Array} inventory - Array inventaris yang akan dimodifikasi
 * @param {string} itemId - ID barang yang akan dikurangi
 * @param {number} kuantitas - Jumlah barang yang dijual
 * @returns {Array} Inventaris yang sudah diperbarui
 */
export function removeCargo(inventory, itemId, kuantitas) {
    const existingItem = inventory.find(i => i.id === itemId);
    
    if (!existingItem) return inventory;
    
    existingItem.jumlah -= kuantitas;
    
    // Jika stok habis, hapus dari daftar inventaris gudang
    if (existingItem.jumlah <= 0) {
        return inventory.filter(i => i.id !== itemId);
    }
    
    return inventory;
}

/**
 * Menghitung estimasi keuntungan atau kerugian per unit berdasarkan harga pasar saat ini
 * @param {Object} inventoryItem - Barang di inventaris
 * @param {number} currentMarketPrice - Harga pasar barang tersebut saat ini
 * @returns {Object} Hasil margin dan persentase profit
 */
export function getProfitMargin(inventoryItem, currentMarketPrice) {
    const margin = currentMarketPrice - inventoryItem.hargaBeli;
    const percentage = (margin / inventoryItem.hargaBeli) * 100;
    return {
        margin: margin,
        percentage: Math.round(percentage * 100) / 100, // Pembulatan 2 angka di belakang koma
        isProfit: margin >= 0
    };
}