require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require("multer");
const { supabase } = require('./supabase');
const { compressImage, generateFileName, validateImage } = require('./utils/imageUtils');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// CORS headers for production
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://aurahunt.quest');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Utility functions
const getTeam = async (teamId) => {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  
  if (error) {
    console.error('Error fetching team:', error);
    return null;
  }
  return data;
};

const getGame = async (gameName) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('name', gameName)
    .single();
  
  if (error) {
    console.error('Error fetching game by name:', error);
    return null;
  }
  return data;
};

const getGameById = async (gameId) => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (error) {
    console.error('Error fetching game by ID:', error);
    return null;
  }
  return data;
};

// Admin endpoint to edit team scores
app.post('/editscore', async (req, res) => {
  try {
    if (req.body.token !== process.env.ADMIN_REQUEST_TOKEN) {
      return res.status(403).send("Wrong Token");
    }

    const { id, aura } = req.body;

    // Get current team data
    const { data: team, error: fetchError } = await supabase
      .from('teams')
      .select('score')
      .eq('id', id)
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Update score
    const newScore = team.score + Number(aura);
    const { error: updateError } = await supabase
      .from('teams')
      .update({ score: newScore })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to update score', error: updateError.message });
    }

    res.status(200).json({ message: "Score updated successfully", newScore });
  } catch (error) {
    console.error('Error updating score:', error);
    res.status(500).json({ message: 'Failed to update scores', error: error.message });
  }
});

// Admin endpoint to toggle question checked status
app.post('/toggleChecked', async (req, res) => {
  const { id, questionId, token } = req.body;
  
  try {
    if (token !== process.env.ADMIN_REQUEST_TOKEN) {
      return res.status(403).send("Wrong Token");
    }

    // Get current checked count
    const { data: teamQuestion, error: fetchError } = await supabase
      .from('team_questions')
      .select('checked')
      .eq('team_id', id)
      .eq('question_id', questionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ message: 'Team question not found' });
    }

    // Update checked count
    const { error: updateError } = await supabase
      .from('team_questions')
      .update({ checked: teamQuestion.checked + 1 })
      .eq('team_id', id)
      .eq('question_id', questionId);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to toggle checked status', error: updateError.message });
    }

    res.status(200).json({ message: "Checked status updated successfully" });
  } catch (error) {
    console.error('Error toggling checked status:', error);
    res.status(500).json({ message: 'Failed to toggle checked status', error: error.message });
  }
});

// Admin endpoint to toggle question solved status
app.post('/toggleSolved', async (req, res) => {
  const { id, questionId, token } = req.body;
  
  try {
    if (token !== process.env.ADMIN_REQUEST_TOKEN) {
      return res.status(403).send("Wrong Token");
    }

    // Get current solved count
    const { data: teamQuestion, error: fetchError } = await supabase
      .from('team_questions')
      .select('solved')
      .eq('team_id', id)
      .eq('question_id', questionId)
      .single();

    if (fetchError) {
      return res.status(404).json({ message: 'Team question not found' });
    }

    // Update solved count
    const { error: updateError } = await supabase
      .from('team_questions')
      .update({ solved: teamQuestion.solved + 1 })
      .eq('team_id', id)
      .eq('question_id', questionId);

    if (updateError) {
      return res.status(500).json({ message: 'Failed to toggle solved status', error: updateError.message });
    }

    res.status(200).json({ message: "Solved status updated successfully" });
  } catch (error) {
    console.error('Error toggling solved status:', error);
    res.status(500).json({ message: 'Failed to toggle solved status', error: error.message });
  }
});

// Admin scoreboard view
app.get('/secretAdminsAuraRoomforEditingScore', async (req, res) => {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        score,
        team_questions (
          question_id,
          attempts,
          checked,
          solved
        )
      `)
      .order('score', { ascending: false });

    if (error) {
      console.error('Error fetching admin data:', error);
      return res.status(500).render("admin-dashboard", { 
        scores: [], 
        message: "Error loading admin data",
        process: { env: { ADMIN_REQUEST_TOKEN: process.env.ADMIN_REQUEST_TOKEN } }
      });
    }

    const scores = teams.map(team => ({
      id: team.id,
      name: team.name,
      score: team.score,
      questions: team.team_questions || []
    }));

    res.render("admin-dashboard", { 
      scores,
      process: { env: { ADMIN_REQUEST_TOKEN: process.env.ADMIN_REQUEST_TOKEN } }
    });
  } catch (error) {
    console.error('Error fetching admin scores:', error);
    res.status(500).render("admin-dashboard", { 
      scores: [], 
      message: "Internal server error",
      process: { env: { ADMIN_REQUEST_TOKEN: process.env.ADMIN_REQUEST_TOKEN } }
    });
  }
});

// Process question answer (correct/incorrect)
app.post('/correctQuestion', async (req, res) => {
  const { teamId, gameId, correct } = req.body;
  
  try {
    // Get game data
    const game = await getGameById(gameId);
    if (!game) {
      return res.status(404).send('Game not found');
    }

    // Get team data
    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).send('Team not found');
    }

    // Get team question status
    const { data: teamQuestion, error: fetchError } = await supabase
      .from('team_questions')
      .select('*')
      .eq('team_id', teamId)
      .eq('question_id', gameId)
      .single();

    if (fetchError || !teamQuestion) {
      return res.status(404).send('Team question not found');
    }

    if (teamQuestion.solved > 0) {
      return res.status(200).json({ message: 'Already Solved' });
    }

    // Update question status and team score
    let scoreChange = 0;
    const updates = { checked: teamQuestion.checked + 1 };

    if (correct) {
      updates.solved = teamQuestion.solved + 1;
      scoreChange = game.score;
    } else {
      scoreChange = -(game.deduction || 0);
    }

    // Update team question
    const { error: updateQuestionError } = await supabase
      .from('team_questions')
      .update(updates)
      .eq('team_id', teamId)
      .eq('question_id', gameId);

    if (updateQuestionError) {
      return res.status(500).send('Failed to update question status');
    }

    // Update team score
    const { error: updateScoreError } = await supabase
      .from('teams')
      .update({ score: team.score + scoreChange })
      .eq('id', teamId);

    if (updateScoreError) {
      return res.status(500).send('Failed to update team score');
    }

    res.status(200).json({ message: 'CHECKED' });
  } catch (error) {
    console.error('Error processing correctQuestion:', error);
    res.status(500).send('Internal server error');
  }
});

// Get game by name
app.get('/game/:id', async (req, res) => {
  const gameName = req.params.id;
  
  try {
    const game = await getGame(gameName);
    if (!game) {
      return res.status(404).send('Not found');
    }
    res.render('index', game);
  } catch (error) {
    console.error('Error retrieving game:', error);
    res.status(500).send('Internal server error');
  }
});

// Instructions page
app.get('/instructions', async (req, res) => {
  try {
    res.render('instructions');
  } catch (err) {
    res.status(500).send('Error retrieving instructions');
  }
});

// Public scoreboard
app.get('/scoreboard', async (req, res) => {
  try {
    const { data: leaderboard, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).render("scoreboard", { scores: [], message: "Error loading leaderboard" });
    }

    res.render("scoreboard", { scores: leaderboard || [] });
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    res.status(500).render("scoreboard", { scores: [], message: "Internal server error" });
  }
});

// Multer configuration for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Image upload endpoint with compression
app.post('/upload', upload.single('file'), async (req, res) => {
  const { teamid, teamtoken, gamename, gameId } = req.body;
  
  try {
    // Validate team credentials
    const team = await getTeam(teamid);
    if (!team || team.token !== teamtoken) {
      return res.status(403).json({ message: 'Invalid credentials' });
    }

    // Validate file
    const validation = validateImage(req.file);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.errors.join(', ') });
    }

    const file = req.file;

    // Compress image
    const compressedBuffer = await compressImage(file.buffer, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 85,
      format: 'webp'
    });

    // Generate filename
    const fileName = generateFileName(teamid, gamename, file.originalname);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('aura-hunt-images')
      .upload(fileName, compressedBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ message: 'Failed to upload file' });
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('aura-hunt-images')
      .getPublicUrl(fileName);

    // Record submission in database
    const { error: dbError } = await supabase
      .from('image_submissions')
      .insert({
        team_id: teamid,
        question_id: parseInt(gameId),
        file_name: fileName,
        file_path: uploadData.path,
        file_size: compressedBuffer.length,
        mime_type: 'image/webp',
        compressed: true
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Don't fail the upload, just log the error
    }

    // Update team question attempts
    const { data: teamQuestion } = await supabase
      .from('team_questions')
      .select('attempts')
      .eq('team_id', teamid)
      .eq('question_id', gameId)
      .single();

    if (teamQuestion) {
      const updatedAttempts = [...(teamQuestion.attempts || []), publicUrl.publicUrl];
      await supabase
        .from('team_questions')
        .update({ 
          attempts: updatedAttempts,
          checked: 0 // Reset checked status for new submission
        })
        .eq('team_id', teamid)
        .eq('question_id', gameId);
    }

    res.status(200).json({ 
      message: 'File uploaded successfully', 
      url: publicUrl.publicUrl,
      compressed: true,
      originalSize: file.size,
      compressedSize: compressedBuffer.length
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Team login endpoint
app.post('/teamlogin', async (req, res) => {
  try {
    const { team: teamId, password } = req.body;
    
    const team = await getTeam(teamId);
    if (team && team.password === password) {
      res.status(200).send({ 
        message: 'Team logged in successfully', 
        token: team.token 
      });
    } else {
      res.status(200).send({ 
        message: team ? 'Wrong password' : 'Team not found' 
      });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Error logging in');
  }
});

// Generate JSON data for external use
app.get('/generate-json', async (req, res) => {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('id, name, score')
      .order('score', { ascending: false });

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch teams', error: error.message });
    }

    res.json(teams || []);
  } catch (error) {
    console.error('Error generating JSON:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});

// Team details page
app.get('/MyTeamAuraScores/:id', async (req, res) => {
  try {
    const teamId = req.params.id;

    // Get team data with questions
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        score,
        team_questions (
          question_id,
          attempts,
          checked,
          solved,
          questions (
            name,
            score,
            deduction
          )
        )
      `)
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return res.status(404).send({ message: 'Team not found' });
    }

    // Format questions data
    const questions = (team.team_questions || []).map(tq => ({
      id: tq.question_id,
      name: tq.questions?.name || `Question ${tq.question_id}`,
      attempts: tq.attempts || [],
      score: tq.questions?.score || 0,
      deduction: tq.questions?.deduction || 0,
      checked: tq.checked > 0,
      solved: tq.solved > 0
    })).sort((a, b) => a.id - b.id);

    res.render('team', {
      score: {
        id: team.id,
        name: team.name,
        score: team.score,
        questions: questions
      }
    });
  } catch (error) {
    console.error('Error fetching team data:', error);
    res.status(500).send({ message: 'Internal server error', error: error.message });
  }
});

// Admin endpoint to reset database
app.get('/supersecretcommandtoresetdb', async (req, res) => {
  try {
    // Reset all team scores
    const { error: resetScoresError } = await supabase
      .from('teams')
      .update({ score: 0 });

    if (resetScoresError) {
      return res.status(500).json({ message: 'Failed to reset team scores' });
    }

    // Reset all team questions
    const { error: resetQuestionsError } = await supabase
      .from('team_questions')
      .update({ 
        attempts: [],
        checked: 0,
        solved: 0
      });

    if (resetQuestionsError) {
      return res.status(500).json({ message: 'Failed to reset team questions' });
    }

    // Clear image submissions
    const { error: clearImagesError } = await supabase
      .from('image_submissions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearImagesError) {
      console.warn('Failed to clear image submissions:', clearImagesError);
    }

    res.status(200).json({ message: 'Database reset successfully' });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ message: 'Failed to reset database' });
  }
});

// Admin endpoint to initialize database
app.get('/supersecretcommandtostartthedatabasewiththejsonquires', async (req, res) => {
  try {
    // This endpoint is now handled by the seed script
    // But we can trigger a reseed if needed
    const { seedDatabase } = require('../database/seed');
    await seedDatabase();
    
    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    res.status(500).json({ message: 'Failed to initialize database' });
  }
});

// 404 handler
app.get('*', (req, res) => {
  res.status(404).send('Not found');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server started on port ${port}`);
  console.log(`📊 Admin dashboard: http://localhost:${port}/secretAdminsAuraRoomforEditingScore`);
  console.log(`🏆 Scoreboard: http://localhost:${port}/scoreboard`);
});

module.exports = app;