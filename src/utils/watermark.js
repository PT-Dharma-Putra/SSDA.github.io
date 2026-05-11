const watermarkedCache = new Map();

/**
 * Menghasilkan Data URL gambar dengan watermark (Logo + Teks)
 * @param {string} src - URL sumber gambar
 * @returns {Promise<string>} - Mengembalikan Data URL gambar ber-watermark
 */
export async function getWatermarkedDataUrl(src) {
    // Gunakan cache jika sudah pernah diproses
    if (watermarkedCache.has(src)) {
        return watermarkedCache.get(src);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const logo = new Image();
        
        img.crossOrigin = "anonymous";
        // logo.crossOrigin = "anonymous"; // Matikan untuk logo lokal agar lebih stabil
        
        let imagesLoaded = 0;
        const totalImages = 2;

        const checkLoaded = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                processImage();
            }
        };

        const processImage = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                
                // 1. Gambar original
                ctx.drawImage(img, 0, 0);
                
                // 2. Tambahkan Logo PT ASD
                const logoScale = 0.12; // Sedikit lebih kecil agar elegan
                const logoWidth = canvas.width * logoScale;
                const logoHeight = (logo.height / logo.width) * logoWidth;
                const padding = canvas.width * 0.03;
                
                const logoX = canvas.width - logoWidth - padding;
                const logoY = canvas.height - logoHeight - padding;
                
                // Gambar background putih tipis di belakang logo
                ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
                ctx.shadowColor = "rgba(0,0,0,0.1)";
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.roundRect(logoX - 15, logoY - 15, logoWidth + 30, logoHeight + 30, 15);
                ctx.fill();
                ctx.shadowBlur = 0; // Reset shadow
                
                ctx.drawImage(logo, logoX, logoY, logoWidth, logoHeight);
                
                // 3. Tambahkan Teks Watermark Diagonal
                const fontSize = Math.max(img.width * 0.035, 20);
                ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(-Math.PI / 4);
                ctx.fillText("PT SWASTIKA SURAGA DHARMA", 0, 0);
                ctx.restore();

                const result = canvas.toDataURL('image/jpeg', 0.9);
                watermarkedCache.set(src, result);
                resolve(result);
            } catch (e) {
                reject(e);
            }
        };

        img.onload = checkLoaded;
        logo.onload = checkLoaded;
        img.onerror = () => reject('Gagal memuat gambar proyek');
        logo.onerror = () => reject('Gagal memuat logo watermark');

        img.src = src;
        logo.src = "/images/SSD2.png";
    });
}

/**
 * Pre-generate watermark untuk gambar secara background
 */
export async function preloadWatermark(src) {
    try {
        await getWatermarkedDataUrl(src);
    } catch (e) {
        // Silent fail
    }
}

/**
 * Inisialisasi watermark "Ghost" untuk semua gambar di halaman
 */
export function initGlobalWatermark() {
    const images = document.querySelectorAll('img:not([data-no-watermark])');
    
    images.forEach(img => {
        // Skip images that are too small (icons, etc)
        const isSmall = () => img.naturalWidth > 0 && img.naturalWidth < 300;
        
        if (img.complete) {
            if (isSmall()) return;
        }

        const originalSrc = img.src;
        if (!originalSrc || originalSrc.startsWith('data:')) return;

        // Preload watermark in background so it's ready when clicked
        preloadWatermark(originalSrc);

        const applyWatermark = () => {
            if (img.src.startsWith('data:')) return;
            if (isSmall()) return;
            
            // Cek apakah sudah ada di cache untuk respon instan
            const cached = watermarkedCache.get(originalSrc);
            if (cached) {
                img.src = cached;
                setTimeout(() => {
                    if (img.src === cached) img.src = originalSrc;
                }, 8000); // Beri waktu lebih lama untuk proses "Save As"
            } else {
                // Jika belum di cache, coba generate (mungkin agak telat untuk klik ini)
                getWatermarkedDataUrl(originalSrc).then(watermarkedSrc => {
                    img.src = watermarkedSrc;
                    setTimeout(() => {
                        if (img.src === watermarkedSrc) img.src = originalSrc;
                    }, 8000);
                }).catch(() => {});
            }
        };

        // Trigger saat tombol mouse ditekan (lebih cepat dari contextmenu)
        img.addEventListener('mousedown', (e) => {
            if (e.button === 2) { // Klik kanan
                applyWatermark();
            }
        });

        // Backup untuk mobile (long press)
        img.addEventListener('contextmenu', (e) => {
            applyWatermark();
        });
    });
}
