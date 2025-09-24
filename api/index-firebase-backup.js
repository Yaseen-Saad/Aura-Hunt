require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require("multer");
const fs = require('fs');
const { db, bucket, } = require('./firebase');
const admin = require('firebase-admin');
// const {increment} = require('firebase/firestore');
const { log } = require('console');
const { kMaxLength } = require('buffer');
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://aurahunt.quest');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/questions.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams.json'), 'utf8'));
const getTeam = async (teamId) => {
  return teams.find((team) => team.id === teamId)
};
const getGame = async (gameName) => {
  return questionsData.find(game => game.name === gameName) || null;
};
const getGameById = async (gameId) => {
  return questionsData.find(game => game.id == gameId) || null;
};
const updateDocument = async (ref, data) => {
  await ref.update(data);
};

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
    const questionRef = db.collection('scores').doc(id).collection('questions').doc(questionId.toString());
    if (!questionRef) {
      return res.status(404).send({ message: 'Question not found' });
    }
    await questionRef.update({
      checked: admin.firestore.FieldValue.increment(1)
    });
    res.status(200).json({ message: "Checked status updated successfully" });
  } catch (error) {
    console.error('Error toggling checked status:', error);
    res.status(500).json({ message: 'Failed to toggle checked status', error: error.message });
  }
});

app.post('/toggleSolved', async (req, res) => {
  const { id, questionId, token } = req.body;
  try {
    if (token !== process.env.ADMIN_REQUEST_TOKEN) {
      return res.status(403).send("Wrong Token");
    }
    const questionRef = db.collection('scores').doc(id).collection('questions').doc(questionId.toString());
    if (!questionRef) {
      return res.status(404).send({ message: 'Question not found' });
    }
    await questionRef.update({
      solved: admin.firestore.FieldValue.increment(1)
    });
    res.status(200).json({ message: "solved status updated successfully" });
  } catch (error) {
    console.error('Error toggling solved status:', error);
    res.status(500).json({ message: 'Failed to toggle solved status', error: error.message });
  }
});

app.get('/secretAdminsAuraRoomforEditingScore', async (req, res) => {
  try {
    const scoresSnapshot = await db.collection('scores').get();
    if (scoresSnapshot.empty) {
      return res.status(404).render("detailedScoreboard", { scores: [], message: "No scores found" });
    }
    const scores = scoresSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        questions: Array.isArray(data.questions) ? data.questions : [], // Ensure questions is an array
        score: data.score || 0 // Ensure score is defined
      };
    });
    // res.render("detailedScoreboard", { scores });
    res.render("scoreboard", { scores });
  } catch (error) {
    console.error('Error fetching scores:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});
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

app.get('/game/:id', async (req, res) => {
  const gameName = req.params.id;
  try {
    const gameDoc = await getGame(gameName);
    console.log(gameDoc);
    if (!gameDoc) {
      return res.status(404).send('Not found');
    }
    res.render('index', gameDoc);
    // res.render('INDEXBEFORE', gameDoc);
  } catch (error) {
    console.error('Error retrieving game:', error);
    res.status(500).send('Internal server error');
  }
});

app.get('/instructions', async (req, res) => {
  try {
    res.render('instructions');
  } catch (err) {
    res.status(500).send('Error retrieving instructions');
  }
});

app.get('/scoreboard', async (req, res) => {
  const response = teams.map(doc => { return { id: doc.id, ...doc } })
  res.render("scoreboard", { scores: response })
});

const upload = multer({
  storage: multer.memoryStorage() // Use memory storage to avoid saving files locally
});

app.post('/upload', upload.single('file'), async (req, res) => {
  const { teamid, teamtoken, gamename, gameId } = req.body;
  try {
    const team = await getTeam(teamid);
    if (team && team.token === teamtoken) {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const fileExtension = file.originalname.split('.').pop(); // Get the file extension
      const newFileName = `${teamid}/${gamename}/${Date.now()}.${fileExtension}`; // Use the original file extension
      const fileUpload = bucket.file(newFileName);
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype, // Use the original MIME type
        },
      });
      stream.on('error', (err) => {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Failed to upload file' });
      });
      await stream.on('finish', async () => {
        try {
          const publicUrl = await fileUpload.getSignedUrl({
            action: 'read',
            expires: Date.now() + 1000 * 60 * 60 * 1000
          });
          const questionRef = db.collection('scores').doc(Number(teamid).toString()).collection('questions').doc(gameId);
          await questionRef.update({
            checked: false,
            attempts: admin.firestore.FieldValue.arrayUnion(publicUrl[0])
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

app.get('/generate-json', async (req, res) => {
  try {
    const scoresSnapshot = await db.collection('scores').get();
    const firebaseScores = scoresSnapshot.docs.map(doc => ({
      id: doc.id,
      score: doc.data().score || 0,
    }));
    const mergedData = teams.map(item => {
      const scoreEntry = firebaseScores.find(score => score.id === item.id);
      return {
        ...item,
        score: scoreEntry ? scoreEntry.score : 0,
      };
    });
    res.json(mergedData);
  } catch (error) {
    console.error('Error generating merged JSON:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});

app.get('/MyTeamAuraScores/:id', async (req, res) => {
  try {
    const scoreDoc = await db.collection('scores').doc(req.params.id).get();
    if (!scoreDoc.exists) {
      return res.status(404).send({ message: 'Score not found' });
    }
    const scoreData = scoreDoc.data();
    const questionsSnapshot = await scoreDoc.ref.collection('questions').get();
    const questions = questionsSnapshot.docs.map(doc => {
      const questionData = doc.data();
      return {
        id: doc.id,
        attempts: questionData.attempts || [],
        score: questionData.score || 0,
        deduction: questionData.deduction || 0,
        checked: questionData.checked || false,
        solved: questionData.solved || false,
      };
    });
    questions.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    res.render('team', {
      score: {
        id: req.params.id,
        score: scoreData.score || 0,
        questions: questions,
      },
    });
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});

app.get('/supersecretcommandtoresetdb', async (req, res) => {
  for (const team of teams) {
    console.log(team);
    await db.collection("scores").doc(team.id.toString()).set({ score: 0 })
    for (const question of questionsData) {
      await db.collection("scores").doc(team.id).collection('questions').doc(question.id.toString()).set({ attempts: [], checked: 0, solved: 0 })
    }
  }
})

app.get('/supersecretcommandtostartthedatabasewiththejsonquires', async (req, res) => {
  for (team in teams) {
    await db.collection('scores').doc(teams[team].id.toString()).update({
      score: teams[team].score
    });
    for (const question in questionsData) {
      if (Object.prototype.hasOwnProperty.call(questionsData, question)) {
        const element = questionsData[question];
        const questionDocRef = db.collection('scores')
          .doc(teams[team].id.toString()).
          collection('questions')
          .doc(element.id.toString())
        const questionDoc = await questionDocRef.get();
        if (!questionDoc.exists) {
          await questionDocRef.set({
            attempts: 0,
            solved: false,
            checked: false,
            score: 0,
            deduction: 0,
          });
        } else {
          await questionDocRef.update({
            attempts: 0,
            solved: false,
            checked: false,
          });
        }
      }
    }
    console.log(teams[team], team);
  }
  return res.status(200).json({ message: 'Correct' });
});

app.get('*', (req, res) => {
  res.status(404).send('Not found');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = app;