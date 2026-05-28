/**
 * JURAGAN PALUGADA SIMULATOR
 * AI Service Module (Multi-NPC & Dynamic Notification Integration)
 * Mengelola komunikasi dengan berbagai NPC AI menggunakan API Key pengguna.
 */

import { gameState, getUsedWarehouseSpace } from '../core/engine.js';

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Menyimpan riwayat obrolan terpisah untuk setiap NPC agar ingatan mereka tidak bercampur
export const npcChatHistories = {
    rentenir: [
        { role: 'assistant', content: 'Oi Bos! Duit setoran bunga aman kan? Jangan kabur lo, anak buah gua pantau ruko lo 24 jam! ada yang mau lu tanyain?' }
    ],
    supplier: [
        { role: 'assistant', content: 'Hoya Bos! Selamat datang di toko grosir Koh Aseng. Cari barang murah buat diserok? Koh Aseng punya info pasokan bagus hari ini, mau nanya apa ha?' }
    ],
    gosip: [
        { role: 'assistant', content: 'Ih Juragan... ssttt, sini deh deketan. Neng Susi denger desas-desus hot banget tentang pergerakan harga komoditas besok loh. Mau tau gosip barang apa yang bakal naik gila-gilaan?' }
    ]
};

// Detail profil untuk ditampilkan di menu daftar kontak WhatsApp
export const NPC_PROFILES = {
    rentenir: {
        nama: "Bang El (Rentenir Cap Badak) 👿",
        status: "Online • Menunggu Setoran",
        avatar: "👿",
        salamMulai: "Oi Bos! Duit setoran bunga aman kan? Jangan kabur lo!"
    },
    supplier: {
        nama: "Koh Aseng (Grosir Glodok) 🇨🇳",
        status: "Online • Menghitung Cuan",
        avatar: "🇨🇳",
        salamMulai: "Hoya Bos! Selamat datang di toko grosir Koh Aseng. Cari barang murah buat diserok?"
    },
    gosip: {
        nama: "Neng Susi (Makelar Gosip Pasar) 💅",
        status: "Online • Mengetik...",
        avatar: "💅",
        salamMulai: "Ih Juragan... ssttt, sini deh deketan. Ada info hot!"
    }
};

export function saveApiKey(key) {
    if (!key) return false;
    localStorage.setItem('juragan_palugada_groq_key', key.trim());
    return true;
}

export function getApiKey() {
    return localStorage.getItem('juragan_palugada_groq_key') || '';
}

export function removeApiKey() {
    localStorage.removeItem('juragan_palugada_groq_key');
}

function generateNpcPrompt(npcId) {
    const sisaHari = gameState.maxDays - gameState.day;
    const sisaKapasitasGudang = gameState.warehouseCapacity - getUsedWarehouseSpace();
    
    const ringkasanInventaris = gameState.inventory.length > 0 
        ? gameState.inventory.map(i => `${i.jumlah} unit ${i.nama} (HPP: Rp ${i.hargaBeli.toLocaleString('id-ID')})`).join(', ')
        : "Kosong melompong";

    const ringkasanPasar = gameState.marketPrices.map(p => {
        return `${p.nama}: Rp ${p.harga.toLocaleString('id-ID')} per unit (Tren: ${p.trend.toUpperCase()})`;
    }).join('\n');

    // Kerangka data sistem yang dikirim sebagai bekal ingatan NPC
    const dataContext = `
KONDISI PERMAINAN REAL-TIME PEMAIN SAAT INI:
- Hari Saat Ini: Hari ke-${gameState.day} dari ${gameState.maxDays} hari (Sisa waktu: ${sisaHari} hari lagi).
- Uang Tunai Pemain: Rp ${gameState.money.toLocaleString('id-ID')}
- Sisa Utang Rentenir: Rp ${gameState.debt.toLocaleString('id-ID')}
- Kapasitas Gudang Tersisa: ${sisaKapasitasGudang} dari ${gameState.warehouseCapacity} Unit.
- Inventaris Gudang Aktif: ${ringkasanInventaris}
- Daftar Harga Pasar Hari Ini:
${ringkasanPasar}
- Situasi Pasar Khusus: ${gameState.currentEvent ? `Sedang terjadi Event "${gameState.currentEvent.nama}" (${gameState.currentEvent.deskripsi})` : 'Situasi pasar stabil.'}
    `;

    // Berikan kepribadian yang unik untuk masing-masing NPC agar tidak terasa kaku
    const personas = {
        rentenir: `Kamu adalah 'Bang El', rentenir preman pasar Tanah Abang yang galak, tegas, tapi sebenarnya peduli dengan kesuksesan finansial pemain (karena kalau pemain bangkrut, utang tidak bisa dibayar).
        gaya bahasa: Kasar, gaul Betawi-Jakarta (lu, gua, bokek, serok, gembok ruko, kicep). Selalu ingatkan pemain tentang sisa utangnya jika utangnya masih besar. Maksimal 2-3 kalimat.`,
        
        supplier: `Kamu adalah 'Koh Aseng', importir barang elektronik dan sembako dari Tiongkok yang membuka ruko grosir besar di Glodok.
        gaya bahasa: Logat Tionghoa-Indonesia yang kental, selalu pakai akhiran 'ha', 'oya', 'cingcai', suka puji pemain 'Bos besar', sangat kalkulatif tentang untung-rugi. Berikan saran logistik yang logis berdasarkan sisa gudang mereka. Maksimal 2-3 kalimat.`,
        
        gosip: `Kamu adalah 'Neng Susi', makelar gosip dan informan pasar gelap yang tahu segalanya tentang rumor naik-turunnya harga komoditas.
        gaya bahasa: Genit, kepo, suka pakai emoji centil, sering memanggil 'Juragan Tampan' atau 'Juragan Manis', menggunakan kata gaul arisan/gosip (jeng, cucok, meroket, boncos, serok manja). Berikan petunjuk terselubung atau teka-teki tentang barang yang harganya sedang naik/turun hari ini. Maksimal 2-3 kalimat.`
    };

    return `Sistem game: ${personas[npcId]} \n\n ${dataContext} \n\n Aturan mutlak: Jangan pernah mengaku sebagai AI dari Google atau Groq. Tetaplah berada di dalam peranmu selama percakapan berlangsung!`;
}

/**
 * Mengirim pesan ke Groq Cloud API berdasarkan NPC yang dipilih
 * @param {string} npcId - ID NPC ('rentenir', 'supplier', 'gosip')
 * @param {string} userMessage - Pesan dari pemain
 * @returns {Promise<string>} - Tanggapan AI
 */
export async function sendNpcChatMessage(npcId, userMessage) {
    const apiKey = getApiKey();
    
    if (!apiKey) {
        throw new Error("API Key belum terpasang di sistem game!");
    }

    // Ambil riwayat percakapan NPC yang bersangkutan
    const history = npcChatHistories[npcId] || [];

    // Filter riwayat obrolan agar tidak terlalu panjang (menghindari limit token Groq)
    const filteredHistory = history
        .filter(msg => !msg.isTyping && msg.content !== '')
        .slice(-6) // Ambil 6 pesan terakhir untuk memori jangka pendek
        .map(msg => ({ role: msg.role, content: msg.content }));

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: generateNpcPrompt(npcId) },
                    ...filteredHistory,
                    { role: "user", content: userMessage }
                ],
                temperature: 0.85, // Nilai kreatif lebih tinggi agar gaya bicaranya makin bervariasi
                max_tokens: 180
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || `HTTP Error ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();

    } catch (error) {
        console.error(`[Groq Service] Gagal menghubungi AI untuk NPC ${npcId}:`, error);
        throw error;
    }
}