require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises; // Use promises-based fs
const path = require('path');
const multer = require('multer');

// JSON Data Paths
const jsonFilePath = path.join(__dirname, '../data/questions.json');
const scoresFilePath = path.join(__dirname, '../data/scores.json');

// Initializations
const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware Setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: 'https://aurahunt.octphysicsclub.org',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept']
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// Centralized Error Handling
const handleError = (err, res) => {
  console.error(err);
  res.status(500).json({ message: 'Server Error' });
};

// Routes
app.get('/scoreboard', async (req, res) => {
  try {
    const scoresFile = JSON.parse(await fs.readFile(scoresFilePath, 'utf8'));
    const scores = scoresFile.map(team => ({ id: team.id, score: team.score }));
    res.render('scoreboard', { scores });
  } catch (err) {
    handleError(err, res);
  }
});

app.post('/teamlogin', async (req, res) => {
  try {
    const scoresFile = JSON.parse(await fs.readFile(scoresFilePath, 'utf8'));
    const team = scoresFile.find(team => team.id === req.body.team);
    if (team) {
      if (team.password === req.body.password) {
        res.status(200).send({ message: 'Team logged in successfully', token: team.token });
      } else {
        res.status(200).send({ message: 'Wrong password' });
      }
    } else {
      res.status(404).send({ message: 'Team not found' });
    }
  } catch (err) {
    handleError(err, res);
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const teamId = req.body.teamid;
    const teamToken = req.body.teamtoken;
    const gameName = req.body.gamename;

    const [scoresFile, jsonFile] = await Promise.all([
      fs.readFile(scoresFilePath, 'utf8').then(JSON.parse),
      fs.readFile(jsonFilePath, 'utf8').then(JSON.parse)
    ]);

    const team = scoresFile.find(team => team.id === teamId);
    if (team && team.token === teamToken) {
      const tempPath = req.file.path;
      const imagePath = path.join(__dirname, '../uploads', `${teamId}_${gameName}_${Date.now()}.png`);

      await fs.rename(tempPath, imagePath);

      const game = jsonFile.find(question => question.name === req.body.gamename);
      const question = team.questions.find(q => q.id === game.id);

      if (question) {
        question.checked = false;
        question.attempts.push(imagePath);

        await fs.writeFile(scoresFilePath, JSON.stringify(scoresFile, null, 2));

        res.status(200).contentType('text/plain').end('File uploaded!');
      } else {
        res.status(500).json({ message: 'Question not found' });
      }
    } else {
      res.status(200).send({ message: "Please Login Again!" });
    }
  } catch (err) {
    handleError(err, res);
  }
});

// Other routes here...

// Catch-all route for undefined paths
app.get('*', (req, res) => {
  res.status(404).send('Not found');
});

// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = app;
