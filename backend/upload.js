// backend/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('./db');

const router = express.Router();

// Créer le dossier uploads si nécessaire
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuration Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Route POST /upload
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;

    const inserts = files.map(file => [
      file.filename,
      file.path,
      file.mimetype,
      file.size
    ]);

    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO images (filename, filepath, mimetype, size) VALUES ?',
      [inserts]
    );
    conn.release();

    res.status(200).json({ message: 'Images uploadées et sauvegardées en base.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de l’upload ou de l’enregistrement en base.' });
  }
});

module.exports = router;
