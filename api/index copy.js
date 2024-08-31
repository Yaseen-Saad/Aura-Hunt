







app.post('/upload', upload.single('file'), async (req, res) => {
  const { teamid, teamtoken, gamename, gameId } = req.body;
  try {
    const teamDoc = await getTeam(teamid);
    if (!teamDoc) {
      return res.status(403).json({ message: 'Invalid team ID' });
    }

    const teamData = teamDoc.data();
    if (teamData.token !== teamtoken) {
      return res.status(403).json({ message: 'Invalid credentials' });
    }

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
    });

    stream.on('finish', async () => {
      try {
        // Get the Firebase Storage URL
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(newFileName)}?alt=media`;

        const questionRef = db.collection('scores').doc(teamid).collection('questions').doc(gameId);
        await questionRef.update({
          checked: false,
          attempts: {
            attempts: admin.firestore.FieldValue.arrayUnion(publicUrl)
          }
        });

        res.status(200).json({ message: 'File uploaded successfully', url: publicUrl });
      } catch (err) {
        console.error('Error updating document:', err);
        res.status(500).json({ message: 'Failed to update document' });
      }
    });

    stream.end(file.buffer);
  } catch (err) {
    console.error('Error processing request:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
















app.get('/game/:id', async (req, res) => {
  const gameName = req.params.id;
  const gameId = req.query.gameId; // Get the gameId parameter
  try {
    const gameDoc = getGameFromJSON(gameName);
    if (!gameDoc) {
      return res.status(404).send('Not found');
    }
    console.log({ gameDoc: gameDoc, gameId: gameId });

    res.render('index', { gameDoc: gameDoc, gameId: gameId }); // Pass the gameDoc and gameId to the template
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
