const { supabase } = require('../api/supabase');
const fs = require('fs');
const path = require('path');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Read JSON data files  
    const teamsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/teams.json'), 'utf8'));
    // Use the new comprehensive questions file
    const questionsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/questions-new.json'), 'utf8'));

    // Seed Questions (using existing schema for now)
    console.log('📚 Seeding questions...');
    const { error: questionsError } = await supabase
      .from('questions')
      .upsert(
        questionsData.map(q => ({
          id: q.id,
          name: q.name,
          description: q.description,
          score: q.score || 0,
          deduction: q.deduction || 0,
          attempts: q.attempts || 'Infinity',
          type: q.type || 'normal',
          proof: q.proof !== undefined ? q.proof : true
        })),
        { onConflict: 'id' }
      );

    if (questionsError) {
      console.error('❌ Error seeding questions:', questionsError);
      return;
    }
    console.log('✅ Questions seeded successfully');

    // Seed Teams
    console.log('👥 Seeding teams...');
    const { error: teamsError } = await supabase
      .from('teams')
      .upsert(
        teamsData.map(team => ({
          id: team.id,
          name: team.name,
          password: team.password,
          token: team.token,
          score: team.score || 0
        })),
        { onConflict: 'id' }
      );

    if (teamsError) {
      console.error('❌ Error seeding teams:', teamsError);
      return;
    }
    console.log('✅ Teams seeded successfully');

    // Initialize team_questions for each team-question combination
    console.log('🔗 Initializing team questions...');
    const teamQuestions = [];
    
    for (const team of teamsData) {
      for (const question of questionsData) {
        teamQuestions.push({
          team_id: team.id,
          question_id: question.id,
          attempts: [],
          checked: 0,
          solved: 0
        });
      }
    }

    const { error: teamQuestionsError } = await supabase
      .from('team_questions')
      .upsert(teamQuestions, { onConflict: 'team_id,question_id', ignoreDuplicates: true });

    if (teamQuestionsError) {
      console.error('❌ Error initializing team questions:', teamQuestionsError);
      return;
    }
    console.log('✅ Team questions initialized successfully');

    // Refresh leaderboard
    console.log('🏆 Refreshing leaderboard...');
    const { error: refreshError } = await supabase.rpc('refresh_leaderboard');
    if (refreshError) {
      console.warn('⚠️ Warning: Could not refresh leaderboard:', refreshError);
    } else {
      console.log('✅ Leaderboard refreshed successfully');
    }

    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedDatabase };