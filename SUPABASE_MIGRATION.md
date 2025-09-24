# Supabase Migration Guide for Aura Hunt

## Overview
This guide will help you migrate your Aura Hunt project from Firebase to Supabase, including database setup, image storage, and API endpoints.

## Prerequisites
- Supabase account and project created
- Node.js and npm installed

## Step 1: Supabase Project Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and keys

2. **Create Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your Supabase credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SUPABASE_ANON_KEY=your_anon_key
   ADMIN_REQUEST_TOKEN=your_admin_token
   ```

## Step 2: Database Setup

1. **Run the Database Schema**
   - Open your Supabase dashboard
   - Go to SQL Editor
   - Copy and run the contents of `database/schema.sql`

2. **Create Storage Bucket**
   In your Supabase dashboard:
   - Go to Storage
   - Create a new bucket named `aura-hunt-images`
   - Make it public
   - Apply these policies in SQL Editor:
   ```sql
   -- Storage policies
   INSERT INTO storage.buckets (id, name, public) VALUES ('aura-hunt-images', 'aura-hunt-images', true);
   
   CREATE POLICY "Allow public read access" ON storage.objects 
   FOR SELECT USING (bucket_id = 'aura-hunt-images');
   
   CREATE POLICY "Allow service role full access" ON storage.objects 
   FOR ALL USING (auth.role() = 'service_role');
   ```

## Step 3: Seed Database

Run the seeding script to populate your database:
```bash
npm run seed
```

This will:
- Import all teams from `data/teams.json`
- Import all questions from `data/questions.json`
- Initialize team-question relationships
- Set up the leaderboard

## Step 4: Install Dependencies

```bash
npm install @supabase/supabase-js sharp
```

## Step 5: Start the Application

For development:
```bash
npm run dev:supabase
```

For production:
```bash
npm run start:supabase
```

## Key Features Implemented

### 🗄️ Database Features
- **Teams Management**: Full CRUD operations for teams
- **Questions/Games**: Dynamic question management
- **Leaderboard**: Real-time scoring with materialized views
- **Image Submissions**: Track all uploaded images with metadata

### 📸 Image Upload Features
- **Automatic Compression**: Images are compressed using Sharp
- **Multiple Formats**: Support for JPEG, PNG, WebP, GIF
- **File Validation**: Size and type validation
- **Organized Storage**: Files organized by team/game/timestamp

### 🏆 Leaderboard Features
- **Real-time Updates**: Automatic leaderboard refresh on score changes
- **Performance Optimized**: Uses materialized views for fast queries
- **Detailed Stats**: Shows questions solved, attempts, etc.

### 🔧 Admin Features
- **Score Management**: Edit team scores directly
- **Question Tracking**: Mark questions as checked/solved
- **Database Reset**: Reset all scores and progress
- **Comprehensive Dashboard**: View all team progress

## API Endpoints

### Public Endpoints
- `GET /game/:name` - Get game by name
- `GET /instructions` - Instructions page
- `GET /scoreboard` - Public scoreboard
- `POST /teamlogin` - Team authentication
- `POST /upload` - Image upload (requires team token)
- `GET /generate-json` - Export teams data as JSON
- `GET /MyTeamAuraScores/:id` - Team detail page

### Admin Endpoints (require ADMIN_REQUEST_TOKEN)
- `POST /editscore` - Edit team scores
- `POST /toggleChecked` - Mark questions as checked
- `POST /toggleSolved` - Mark questions as solved
- `POST /correctQuestion` - Process correct/incorrect answers
- `GET /secretAdminsAuraRoomforEditingScore` - Admin dashboard

### Utility Endpoints
- `GET /supersecretcommandtoresetdb` - Reset database
- `GET /supersecretcommandtostartthedatabasewiththejsonquires` - Re-seed database

## Database Schema

### Tables
1. **teams** - Team information and scores
2. **questions** - Game questions and scoring
3. **team_questions** - Team progress per question
4. **image_submissions** - Image upload tracking

### Views
1. **leaderboard** - Materialized view for performance

## Image Compression Settings

Images are automatically compressed with these settings:
- **Max Resolution**: 1920x1080
- **Format**: WebP (for best compression)
- **Quality**: 85%
- **Progressive**: Enabled for faster loading

## Security Features

- **Row Level Security**: Enabled on all tables
- **Token-based Authentication**: Teams use secure tokens
- **Admin Protection**: Admin endpoints require special token
- **File Validation**: Images are validated before upload
- **CORS Protection**: Configured for production domain

## Performance Optimizations

- **Database Indexes**: Strategic indexes on frequently queried columns
- **Materialized Views**: Fast leaderboard queries
- **Image Compression**: Reduced bandwidth and storage usage
- **Connection Pooling**: Efficient database connections

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**
   - Make sure your `.env` file exists and contains all required variables

2. **Database Connection Issues**
   - Verify your Supabase URL and service role key
   - Check if your IP is whitelisted in Supabase (if IP restrictions are enabled)

3. **Storage Upload Failures**
   - Ensure the `aura-hunt-images` bucket exists and is public
   - Verify storage policies are correctly applied

4. **Seeding Errors**
   - Check that your JSON files (`teams.json`, `questions.json`) are valid
   - Ensure database schema is properly applied

### Debug Commands

```bash
# Test database connection
node -e "const {supabase} = require('./api/supabase'); supabase.from('teams').select('count').then(console.log)"

# Reset and reseed database
npm run db:reset

# Check logs
npm run dev:supabase
```

## Migration Checklist

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database schema applied
- [ ] Storage bucket created with policies
- [ ] Dependencies installed
- [ ] Database seeded
- [ ] Application running on new endpoint
- [ ] Admin dashboard accessible
- [ ] Image uploads working
- [ ] Leaderboard updating correctly

## Next Steps

1. Test all functionality with the new Supabase backend
2. Update your frontend to use the new API endpoints
3. Deploy to production environment
4. Update DNS/domain settings if needed
5. Monitor performance and optimize as needed

## Support

If you encounter any issues during migration, check:
1. Supabase dashboard for error logs
2. Browser console for client-side errors
3. Server logs for API errors
4. Database logs in Supabase dashboard