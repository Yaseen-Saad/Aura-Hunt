const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const backend = args[0];

if (!backend || !['firebase', 'supabase'].includes(backend)) {
  console.log('Usage: node scripts/switch-backend.js [firebase|supabase]');
  console.log('This script switches between Firebase and Supabase backends');
  process.exit(1);
}

const apiDir = path.join(__dirname, '..', 'api');
const vercelConfigPath = path.join(__dirname, '..', 'vercel.json');

try {
  if (backend === 'firebase') {
    // Copy Firebase version to main index.js
    if (fs.existsSync(path.join(apiDir, 'index-firebase-backup.js'))) {
      fs.copyFileSync(
        path.join(apiDir, 'index-firebase-backup.js'),
        path.join(apiDir, 'index.js')
      );
    } else {
      console.error('Firebase backup file not found. Please restore it manually.');
      process.exit(1);
    }

    // Update Vercel config for Firebase
    const vercelConfig = {
      "functions": {
        "api/index.js": {
          "maxDuration": 30
        }
      },
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/api/index.js"
        }
      ]
    };
    fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
    
    console.log('✅ Switched to Firebase backend');
    console.log('📝 Updated Vercel configuration');
    console.log('🚀 Run: npm run devStart');

  } else if (backend === 'supabase') {
    // Copy Supabase version to main index.js  
    fs.copyFileSync(
      path.join(apiDir, 'index-supabase.js'),
      path.join(apiDir, 'index.js')
    );

    // Update Vercel config for Supabase
    const vercelConfig = {
      "functions": {
        "api/index.js": {
          "maxDuration": 30
        }
      },
      "rewrites": [
        {
          "source": "/(.*)",
          "destination": "/api/index.js"
        }
      ],
      "env": {
        "SUPABASE_URL": "@supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key", 
        "SUPABASE_ANON_KEY": "@supabase-anon-key",
        "ADMIN_REQUEST_TOKEN": "@admin-token"
      }
    };
    fs.writeFileSync(vercelConfigPath, JSON.stringify(vercelConfig, null, 2));
    
    console.log('✅ Switched to Supabase backend');
    console.log('📝 Updated Vercel configuration');
    console.log('🔧 Make sure your .env file is configured with Supabase credentials');
    console.log('🚀 Run: npm run devStart');
  }
} catch (error) {
  console.error('❌ Error switching backend:', error.message);
  process.exit(1);
}