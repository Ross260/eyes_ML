// backend/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const router = express.Router();

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const files = req.files;

    const conn = await pool.getConnection();

    for (const file of files) {
      const imageData = fs.readFileSync(file.path); // Lire le fichier en binaire
      await conn.query(
        'INSERT INTO images (filename, path, data, mimetype) VALUES (?, ?, ?, ?)',
        [file.filename, file.path, imageData, file.mimetype]
      );
    }

    conn.release();

    res.status(200).json({ message: 'Images uploadées et données stockées avec succès.' });
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur lors de l’upload ou de l’enregistrement en base.' });
  }
});

module.exports = router;
