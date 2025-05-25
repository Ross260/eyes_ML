const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const pool = require('./db').default;
const bcrypt = require('bcrypt');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json()); // <- Obligatoire pour parser les requêtes JSON

// === UPLOAD SETUP ===
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

app.post('/upload', upload.array('images'), async (req, res) => {
  try {
    const files = req.files;
    const conn = await pool.getConnection();

    for (const file of files) {
      const imageData = fs.readFileSync(file.path);
      await conn.query(
        'INSERT INTO images (filename, path, data, mimetype) VALUES (?, ?, ?, ?)',
        [file.filename, file.path, imageData, file.mimetype]
      );
    }

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

// === REGISTER ROUTE ===
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Champs manquants.' });
  }

  try {
    const conn = await pool.getConnection();

    const [existing] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await conn.query(
      'INSERT INTO users (nom, email, mot_de_passe) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    conn.release();

    res.status(201).json({ message: 'Utilisateur inscrit avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
