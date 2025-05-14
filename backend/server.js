const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pool = require('./db').default; // ← Connexion à MySQL

const app = express();
const PORT = 4000;

app.use(cors());

// Créer le dossier upload s'il n'existe pas
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configuration Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Route POST pour uploader et enregistrer en BDD
app.post('/upload', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;

    const values = files.map(file => [
      file.filename,
      file.path,
      file.mimetype,
      file.size
    ]);

    const conn = await pool.getConnection();
    await conn.query(
      'INSERT INTO images (filename, filepath, mimetype, size) VALUES ?',
      [values]
    );
    conn.release();

    res.status(200).json({
      message: 'Images uploadées et sauvegardées en base de données.',
      files
    });
  } catch (err) {
    console.error('Erreur lors de l\'upload ou de l\'insertion en base :', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
