require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require("multer");
const fs = require('fs');
const { db, bucket } = require('./firebase');
const admin = require('firebase-admin');

const app = express();

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

// Load questions from JSON file
const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/questions.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams.json'), 'utf8'));

// Helper Function to Retrieve Team Document
const getTeam = async (teamId) => {
  return teams.find((team) => team.id === teamId)
};

// Helper Function to Retrieve Game Document
const getGame = async (gameName) => {
  console.log(questionsData);

  return questionsData.find(game => game.name === gameName) || null;
};

// Helper Function to Update Document
const updateDocument = async (ref, data) => {
  await ref.update(data);
};

// Scoreboard Endpoint
app.get('/scoreboard', async (req, res) => {
  try {
    const scoresSnapshot = await db.collection('scores').get();
    const scores = scoresSnapshot.docs.map(doc => ({ id: doc.id, score: doc.data().score }));
    res.render('scoreboard', { scores: scores });
  } catch (err) {
    res.status(500).send('Error retrieving scores');
  }
});

app.get('/score/:id', async (req, res) => {
  try {
    const scoreDoc = await db.collection('scores').doc(req.params.id).get();
    if (!scoreDoc.exists) {
      return res.status(404).send({ message: 'Score not found' });
    }
    const scoreData = scoreDoc.data();
    const questions = await scoreDoc.ref.collection('questions').get();

    if (!questions.docs.length) {
      return res.status(404).send({ message: 'No questions found' });
    }
    const scores = questions.docs.map((question) => { return { id: question.id, ...question.data() } });
    console.log({ score: { id: req.params.id, score: scoreData.score, questions: scores } }.score.questions);
    res.render("team", { score: { id: req.params.id, score: scoreData.score, questions: scores } });
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});



app.post('/editscore', async (req, res) => {
  try {
    if (req.body.token !== process.env.ADMIN_REQUEST_TOKEN) {
      return res.status(403).send("Wrong Token");
    }

    const teamRef = db.collection('scores').doc(req.body.id);
    const teamDoc = await teamRef.get();

    if (!teamDoc.exists) {
      return res.status(404).send({ message: 'Team not found' });
    }

    const teamData = teamDoc.data();
    const updatedScore = teamData.score + Number(req.body.aura);

    await teamRef.update({ score: updatedScore });

    res.status(200).json({ message: "Score updated successfully" });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ message: 'Failed to update scores', error: error.message });
  }
});


app.post('/toggleChecked', async (req, res) => {
  const { id, questionId, token } = req.body;
  try {
    if (token !== process.env.ADMIN_REQUEST_TOKEN) {
      return res.status(403).send("Wrong Token");
    }
    const teamRef = db.collection('scores').doc(id);
    const teamDoc = await teamRef.get();
    if (!teamDoc.exists) {
      return res.status(404).send({ message: 'Team not found' });
    }
    const teamData = teamDoc.data();
    const questionRef = teamData.ref.collection('questions').doc(questionId.toString());
    const questionDoc = await questionRef.get();
    const question = questionDoc.data();
    if (!question) {
      return res.status(404).send({ message: 'Question not found' });
    }
    if (question.solved) {
      return res.status(200).json({ message: 'Already Solved' });
    }
    question.checked = !question.checked;
    await updateDocument(questionRef, question);
    res.status(200).json({ message: "Checked status updated successfully" });
  } catch (error) {
    console.error('Error toggling checked status:', error);
    res.status(500).json({ message: 'Failed to toggle checked status', error: error.message });
  }
});



// Login Endpoint
app.post('/teamlogin', async (req, res) => {
  try {
    const team = await getTeam(req.body.team)
    if (team && team.password === req.body.password) {
      res.status(200).send({ message: 'Team logged in successfully', token: team.token });
    } else {
      res.status(200).send({ message: team ? 'Wrong password' : 'Team not found' });
    }
  } catch (err) {
    res.status(500).send('Error logging in');
  }
});

// Multer setup for handling multipart/form-data
const upload = multer({
  storage: multer.memoryStorage() // Use memory storage to avoid saving files locally
});


// Image Upload Endpoint

























app.post('/upload', upload.single('file'), async (req, res) => {
  const { teamid, teamtoken, gamename, gameId } = req.body;
  try {
    const team = await getTeam(teamid);
    if (team && team.token === teamtoken) {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const newFileName = `${teamid}/${gamename}/${Date.now()}.png`;
      const fileUpload = bucket.file(newFileName);
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });
      stream.on('error', (err) => {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Failed to upload file' });
      })
      await stream.on('finish', async () => {
        try {
          console.log(req.file)
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${req.body.teamid}.appspot.com/o/${req.body.gamename}/${req.file.originalname}?alt=media&token=${req.file.token}`;
          const questionRef = db.collection('scores').doc(teamid).collection('questions').doc(gameId);
          await questionRef.update({
            checked: false,
            attempts: admin.firestore.FieldValue.arrayUnion(publicUrl)

          });
          res.status(200).json({ message: 'File uploaded successfully', url: publicUrl });
        } catch (err) {
          console.error('Error updating document:', err);
          res.status(500).json({ message: 'Failed to update document' });
        }
      });
      stream.end(file.buffer);
    } else {
      res.status(403).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error processing request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});














// Route to Submit an Answer
// app.post('/answer', async (req, res) => {
//   const { teamId, gameId, answer } = req.body;
//   try {
//     const gameDoc = await db.collection('questions').doc(gameId.toString()).get();
//     if (!gameDoc.exists) {
//       return res.status(404).send('Game not found');
//     }
//     const game = gameDoc.data();

//     const teamDoc = await getTeam(teamId);
//     if (!teamDoc) {
//       return res.status(404).send('Team not found');
//     }
//     const team = teamDoc.data();

//     const questionRef = teamDoc.ref.collection('questions').doc(gameId.toString());
//     const questionDoc = await questionRef.get();
//     const question = questionDoc.data();

//     if (!question || question.solved) {
//       return res.status(200).json({ message: 'Already Solved' });
//     }
//     if (question.attempts.length < game.attempts) {
//       question.attempts.push(answer);
//       if (game.answer === answer) {
//         team.score += game.score;
//         question.solved = true;
//         await updateDocument(questionRef, question);
//         await updateDocument(teamDoc.ref, team);
//         res.status(200).json({ message: 'Correct' });
//       } else {
//         if (game.deduction) {
//           team.score -= game.deduction;
//         }
//         await updateDocument(teamDoc.ref, team);
//         await updateDocument(questionRef, question);
//         res.status(501).json({ message: 'Wrong Answer', rAttempts: game.attempts - question.attempts.length });
//       }
//     } else {
//       res.status(200).json({ message: 'No more attempts', rAttempts: game.attempts - question.attempts.length });
//     }
//   } catch (error) {
//     console.error('Error processing answer:', error);
//     res.status(500).send('Internal server error');
//   }
// });

app.get('/adminEditScore', async (req, res) => {
  try {
    // Fetch the scores data from Firestore
    const scoresSnapshot = await db.collection('scores').get();

    if (scoresSnapshot.empty) {
      return res.status(404).render("detailedScoreboard", { scores: [], message: "No scores found" });
    }

    // Transform Firestore documents into an array
    const scores = scoresSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        questions: Array.isArray(data.questions) ? data.questions : [], // Ensure questions is an array
        score: data.score || 0 // Ensure score is defined
      };
    });

    // Render the detailedScoreboard view with the scores data
    res.render("detailedScoreboard", { scores });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});

// Route to Toggle Checked Status


// Route to Give Bonus for Answers
app.post('/correctQuestion', async (req, res) => {
  const { teamId, gameId, correct } = req.body;
  try {
    const gameDoc = await db.collection('questions').doc(gameId.toString()).get();
    if (!gameDoc.exists) {
      return res.status(404).send('Game not found');
    }
    const game = gameDoc.data();
    const teamDoc = await getTeam(teamId);
    if (!teamDoc) {
      return res.status(404).send('Team not found');
    }
    const team = teamDoc.data();

    const questionRef = teamDoc.ref.collection('questions').doc(gameId.toString());
    const questionDoc = await questionRef.get();
    const question = questionDoc.data();

    if (!question || question.solved) {
      return res.status(200).json({ message: 'Already Solved' });
    }
    question.checked = true;
    if (correct) {
      question.solved = true;
      team.score += game.score;
    } else {
      team.score -= game.deduction;
    }
    await updateDocument(questionRef, question);
    await updateDocument(teamDoc.ref, team);
    res.status(200).json({ message: 'CHECKED' });
  } catch (error) {
    console.error('Error processing correctQuestion:', error);
    res.status(500).send('Internal server error');
  }
});

// Route to Get Specific Game's Question by ID
app.get('/game/:id', async (req, res) => {
  const gameName = req.params.id;
  const gameId = req.query.gameId; // Get the name parameter
  try {
    const gameDoc = await getGame(gameName);
    if (!gameDoc) {
      return res.status(404).send('Not found');
    }
    res.render('index', gameDoc); // Pass the name parameter to the template
  } catch (error) {
    console.error('Error retrieving game:', error);
    res.status(500).send('Internal server error');
  }
});
// Route to Render Instructions Page
app.get('/instructions', async (req, res) => {
  try {
    const scoresSnapshot = await db.collection('scores').get();
    const scores = scoresSnapshot.docs.map(doc => ({ id: doc.id, score: doc.data().score }));
    res.render('instructions', { scores: scores });
  } catch (err) {
    res.status(500).send('Error retrieving instructions');
  }
});

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
