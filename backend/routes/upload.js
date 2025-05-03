const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const authMiddleware = require('../middleware/auth');

// Vérifier la configuration Cloudinary
const cloudinaryConfig = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
  console.error('Erreur : Les variables d\'environnement Cloudinary ne sont pas définies.');
  process.exit(1);
}

// Configure Cloudinary
cloudinary.config(cloudinaryConfig);

// Configure Multer pour le stockage en mémoire
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Type de fichier non supporté.'));
    }
    cb(null, true);
  }
});

router.post('/', authMiddleware, upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
    }

    // Télécharger le fichier sur Cloudinary
    const result = await cloudinary.uploader.upload_stream({
      resource_type: 'auto',
      folder: 'tchat_online',
    }, (error, result) => {
      if (error) {
        throw error;
      }
      return result;
    }).end(req.file.buffer);

    res.status(200).json({
      url: result.secure_url,
      media_type: result.resource_type,
      public_id: result.public_id
    });

  } catch (error) {
    console.error('Erreur lors du téléchargement vers Cloudinary:', error);
    res.status(500).json({ error: 'Échec du téléchargement du fichier.' });
  }
});

module.exports = router;