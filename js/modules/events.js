/**
 * JURAGAN PALUGADA SIMULATOR
 * Module: Events
 * Mengelola daftar event acak yang memengaruhi harga pasar secara dinamis setiap harinya.
 */

// Daftar event pasar acak beserta efek pengalinya (multiplier)
export const MARKET_EVENTS = [
    { id: 'inflasi', nama: 'Inflasi Sembako', deskripsi: 'Harga beras dan minyak melonjak naik akibat kelangkaan!', target: ['beras', 'minyak'], multiplier: 1.8 },
    { id: 'panen', nama: 'Panen Raya', deskripsi: 'Panen raya melimpah ruah! Harga beras turun drastis di pasaran.', target: ['beras'], multiplier: 0.5 },
    { id: 'tech_crash', nama: 'Subsidi Gawai', deskripsi: 'Pasokan gawai membludak dari luar negeri, harga laptop dan smartphone anjlok.', target: ['laptop', 'smartphone'], multiplier: 0.6 },
    { id: 'pembangunan', nama: 'Proyek Infrastruktur', deskripsi: 'Pembangunan kota sedang gencar, semen dicari di mana-mana!', target: ['semen'], multiplier: 1.6 },
    { id: 'gagal_panen', nama: 'Musim Paceklik', deskripsi: 'Cuaca buruk membuat panen gagal. Harga beras meroket tajam!', target: ['beras'], multiplier: 1.5 },
    { id: 'cuci_gudang', nama: 'Cuci Gudang Pabrik', deskripsi: 'Pabrik melakukan cuci gudang akhir tahun, harga semen dan minyak turun!', target: ['semen', 'minyak'], multiplier: 0.7 },
    { id: 'wfh', nama: 'Tren Kerja Remote', deskripsi: 'Banyak perusahaan beralih WFH, permintaan laptop bekas meroket!', target: ['laptop'], multiplier: 1.7 }
];

/**
 * Menentukan apakah ada event yang terjadi hari ini secara acak
 * @param {number} probability - Peluang terjadinya event