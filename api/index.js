// Libraries
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require("multer");

// JSON Data
const jsonFile = require('../data/questions.json');
const scoresFile = require('../data/scores.json');
// Initializations
const app = express();

// const handleError = (err, res) => {
//   res
//     .status(500)
//     .contentType("text/plain")
//     .end("Oops! Something went wrong!");
// };

// const upload = multer({
//   dest: "/path/to/temporary/directory/to/store/uploaded/files"
// });
app.post(
  "/upload",
  // upload.single("file"),
  (req, res) => {
    // const tempPath = req.file.path;
    const teamId = req.body.teamid;
    const teamToken = req.body.teamtoken;
    const gameName = req.body.gamename;
    const team = scoresFile.find(team => team.id === teamId);
    if (team.token === teamToken) {
      console.log(gameName);
      const imagePath = path.join(__dirname, "../uploads/", teamId + "_" + gameName + "_" + Date.now() + ".png");
      console.log(imagePath);
      //   const targetPath = path.join(__dirname, "../uploads/", teamId + "_" + req.body.name + "_" + req.body.attempt + ".png");
      //   fs.rename(tempPath, targetPath, err => {
      //     if (err) return handleError(err, res);
      //     res
      //       .status(200)
      //       .contentType("text/plain")
      //       .end("File uploaded!");
      //   });
    } else {
      res.status(200).send({ message: "Please Login Again!" })
    }
  }
);




// Middleware Setup
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// CORS Configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://aurahunt.octphysicsclub.org');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Route to List All Games
app.get('/games', (req, res) => {
  const games = jsonFile.map(game => `<li><a href="/game/${game.name}">${game.name}</a></li>`);
  res.send(`<!DOCTYPE html><html><body><h1>Game List</h1><ul>${games.join('')}</ul></body></html>`);
});

// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});


// Route to Get Specific Game's Question by ID
app.get('/question/:id', (req, res) => {
  const gameId = parseInt(req.params.id);
  try {
    const game = jsonFile.find(game => game.id === gameId);
    if (!game) {
      res.status(404).send('Game not found');
    } else {
      res.send(game);
    }
  } catch (error) {
    console.error('Error reading JSON file:', error);
    res.status(500).send('Error reading JSON file');
  }
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
    if (question.attempts < game.attempts) {
      if (game.answer === answer) {
        team.score += game.score;
        question.attempts += 1;
        question.solved = true;

        updateScores(scoresFile, res, 'Correct');
      } else {
        if (game.deduction) {
          team.score -= game.deduction;
        }
        question.attempts += 1;
        updateScores(scoresFile, res, 'Wrong Answer', 501, { rAttempts: game.attempts - question.attempts });
      }
    } else {
      res.status(200).json({ message: 'No more attempts', rAttempts: game.attempts - question.attempts });
    }

  } catch (error) {
    console.error('Error processing answer:', error);
    res.status(500).send('Internal server error');
  }
});


// Helper function to update scores
const updateScores = (scoresFile, res, message, status = 200, extra = {}) => {
  fs.writeFile('../data/scores.json', JSON.stringify(scoresFile, null, 2), err => {
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
app.get('/scoreboard', (req, res) => {
  const scores = scoresFile.map(team => { return { id: team.id, score: team.score } });
  res.render('scoreboard', { scores: scores });
})
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
app.get('/instructions', (req, res) => {
  const scores = scoresFile.map(team => { return { id: team.id, score: team.score } });
  res.render('instructions', { scores: scores });
})

// Catch-all route for undefined paths
app.get('*', (req, res) => {
  res.status(404).send('Not found');
});

module.exports = app;
