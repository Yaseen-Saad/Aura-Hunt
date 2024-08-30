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

// // Libraries
// require('dotenv').config()
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const fs = require('fs');
// const path = require('path');
// const multer = require("multer");

// // JSON Data
// const jsonFile = require('../data/questions.json');
// const scoresFile = require('../data/scores.json');
// // Initializations
// const app = express();

// // Middleware Setup
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cors());
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, '../views'));
// app.use(express.static(path.join(__dirname, '../public')));

// // CORS Configuration
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', 'https://aurahunt.octphysicsclub.org');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
//   next();
// });  
// Pages
// Client
// Scoreboard
app.get('/scoreboard', (req, res) => {
  const scores = scoresFile.map(team => { return { id: team.id, score: team.score } });
  res.render('scoreboard', { scores: scores });
})
// login
app.post('/teamlogin', (req, res) => {
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
})

// Image "/upload" endpoint





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



// All Games End point
app.get('/games', (req, res) => {
  const games = jsonFile.map(game => `<li><a href="/game/${game.name}">${game.name}</a></li>`);
  res.send(`<!DOCTYPE html><html><body><h1>Game List</h1><ul>${games.join('')}</ul></body></html>`);
});

// Detaild Scoreboard End point
app.get('/adminEditScore', (req, res) => {
  // const scores = scoresFile.find(team => +team.id == req.params.id);
  res.render("detailedScoreboard", { scores: scoresFile })
  // res.send({ message: "not found", data: req.params.id })
});

// Route to Submit an Answer
app.post('/answer', (req, res) => {
  const { teamId, gameId, answer } = req.body;
  try {
    const game = jsonFile.find(game => game.id === parseInt(gameId));
    if (!game) {
      return res.status(404).send('Game not found');
    }
    const team = scoresFile.find(team => team.id === teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }
    const question = team.questions.find(question => question.id === gameId);
    if (!question || question.solved) {
      return res.status(200).json({ message: 'Already Solved' });
    }
    game.attempts = game.attempts === "Infinity" ? Infinity : game.attempts;
    if (question.attempts.length < game.attempts) {
      question.attempts.push(answer);
      if (game.answer === answer) {
        team.score += game.score;
        question.solved = true;
        updateScores(scoresFile, res, 'Correct');
      } else {
        if (game.deduction) {
          team.score -= game.deduction;
        }
        question.attempts += 1;
        updateScores(scoresFile, res, 'Wrong Answer', 501, { rAttempts: game.attempts - question.attempts.length });
      }
    } else {
      res.status(200).json({ message: 'No more attempts', rAttempts: game.attempts - question.attempts.length });
    }

  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).send('Internal server error');
  }
});



// Route to toggle checked
app.post('/toggleChecked', (req, res) => {
  const { id, questionId } = req.body;
  try {
    const team = scoresFile.find(team => team.id === id);
    if (!team) {
      return res.status(404).send('Team not found');
    }
    const question = team.questions.find(question => question.id == questionId);
    console.log(id, questionId);

    if (!question || question.solved) {
      return res.status(200).json({ message: 'Already Solved' });
    }
    question.checked = true;
    updateScores(scoresFile, res, 'CHECKED');
  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).send('Internal server error');
  }
});
// Route to give bonus for answers
app.post('/correctQuestion', (req, res) => {
  const { teamId, gameId, correct } = req.body;
  try {
    const game = jsonFile.find(game => game.id === parseInt(gameId));
    if (!game) {
      return res.status(404).send('Game not found');
    }
    const team = scoresFile.find(team => team.id === teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }
    const question = team.questions.find(question => question.id === gameId);
    if (!question || question.solved) {
      return res.status(200).json({ message: 'Already Solved' });
    }
    question.checked = true;
    if (correct) {

      question.solved = correct;
      team.score += game.score
    } else {
      team.score -= game.deduction
    }
    updateScores(scoresFile, res, 'CHECKED');
  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).send('Internal server error');
  }
});



// // Route to Get Specific Game's Question by ID
// app.get('/question/:id', (req, res) => {
//   const gameId = parseInt(req.params.id);  
//   try {
//     const game = jsonFile.find(game => game.id === gameId);  
//     if (!game) {
//       res.status(404).send('Game not found');  
//     } else {
//       res.send(game);  
//     }
//   } catch (error) {
//     console.error('Error reading JSON file:', error);  
//     res.status(500).send('Error reading JSON file');
// }
// });

app.get('/score/:id', (req, res) => {
  const scores = scoresFile.find(team => +team.id == req.params.id);
  console.log();

  res.render("team", { score: scores })
});
app.post('/editscore', (req, res) => {
  const team = scoresFile.find(team => +team.id == req.body.id);
  if (req.body.token === process.env.ADMIN_REQUEST_TOKEN) {
    console.log(team);
    team.score += Number(req.body.aura);
    fs.writeFile('./data/scores.json', JSON.stringify(scoresFile, null, 2), err => {
      if (err) {
        console.error('Error writing to scores.json:', err);
        res.status(500).json({ message: 'Failed to update scores' });
      } else {
        res.status(200).json({ message: "score added succefully" });
      }
    });
  } else {
    res.status(500).send("Wrong Token")
  }
});


// Helper function to update scores
const updateScores = (scoresFile, res, message, status = 200, extra = {}) => {
  fs.writeFile('./data/scores.json', JSON.stringify(scoresFile, null, 2), err => {
    if (err) {
      console.error('Error writing to scores.json:', err);
      res.status(500).json({ message: 'Failed to update scores' });
    } else {
      res.status(status).json({ message, ...extra });
    }
  });
};

// Route to Render a Specific Game Page by ID
app.get('/game/:id', (req, res) => {
  const gameName = req.params.id;
  const selectedGame = jsonFile.find(game => game.name === gameName);
  if (selectedGame) {
    console.log(selectedGame);
    res.render('index', selectedGame);
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/instructions', (req, res) => {
  const scores = scoresFile.map(team => { return { id: team.id, score: team.score } });
  res.render('instructions', { scores: scores });
})

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