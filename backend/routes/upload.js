const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authMiddleware } = require('../middleware/authBetter');
const { csrfProtection } = require('../middleware/csrf');


const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
    console.error('Erreur : Les variables d\'environnement Cloudinary ne sont pas définies. Veuillez configurer CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET dans votre fichier .env');
}

// Configure Cloudinary
cloudinary.config(cloudinaryConfig);

// Magic bytes signatures for allowed file types
const MAGIC_BYTES = [
    { bytes: [0xFF, 0xD8, 0xFF], mime: 'image/jpeg' },
    { bytes: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
    { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
    { bytes: [0x42, 0x4D], mime: 'image/bmp' },
    // WebP: RIFF header (bytes 0-3) + "WEBP" marker (bytes 8-11)
    { bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], mime: 'image/webp' },
    { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], mime: 'video/mp4' }, // ftyp MP4
    { bytes: [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], mime: 'video/mp4' },
];

function detectMimeFromBuffer(buffer) {
    for (const sig of MAGIC_BYTES) {
        if (buffer.length >= sig.bytes.length) {
            // null entries act as wildcard bytes (e.g. WebP variable-length size field)
            const match = sig.bytes.every((byte, i) => byte === null || buffer[i] === byte);
            if (match) return sig.mime;
        }
    }
    return null;
}

// Configure Multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-flv', 'video/webm'];
        const allowedExtensions = /\.(jpe?g|png|gif|bmp|webp|mp4|mpeg|mov|avi|flv|webm)$/i;
        if (!allowedTypes.includes(file.mimetype) || !allowedExtensions.test(file.originalname)) {
            return cb(new Error(`Type de fichier non supporté: ${file.mimetype}. Types acceptés: ${allowedTypes.join(', ')}`));
        }
        cb(null, true);
    }
});

router.post('/', authMiddleware, csrfProtection, upload.single('media'), async (req, res) => {
    // Vérification d'autorisation supplémentaire
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
        }

        const fileBuffer = req.file.buffer;

        // Server-side magic bytes validation (defeats MIME spoofing)
        const detectedMime = detectMimeFromBuffer(fileBuffer);
        const isImage = req.file.mimetype.startsWith('image/');
        if (isImage && detectedMime === null) {
            return res.status(415).json({ error: 'Le contenu du fichier ne correspond pas à un format image valide.' });
        }

        const uploadPromise = new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                resource_type: 'auto', 
                folder: 'babichat_online',
            }, (error, result) => {
                if (error) {
                    return reject(error);
                }
                resolve(result);
            });
            stream.end(fileBuffer); 
          });

        const result = await uploadPromise; 

        if (!result || !result.secure_url || !result.resource_type) {
             console.error('Réponse inattendue de Cloudinary:', result);
             return res.status(500).json({ error: 'Échec du téléchargement vers Cloudinary: réponse invalide.' });
        }

        res.status(200).json({
            url: result.secure_url, 
            media_type: result.resource_type, 
            public_id: result.public_id 
        });

    } catch (error) {
        console.error('Erreur lors du téléchargement vers Cloudinary:', error);

        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'Le fichier est trop volumineux. La taille maximale est de 10 Mo.' });
            }
        }

        if (error.message && error.message.startsWith('Type de fichier non supporté')) {
            return res.status(415).json({ error: 'Type de fichier non supporté' });
        }
        res.status(500).json({ error: 'Échec du téléchargement du fichier. Veuillez réessayer.' });
    }
});

module.exports = router;