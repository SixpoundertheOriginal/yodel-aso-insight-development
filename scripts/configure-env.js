#!/usr/bin/env node
import readline from 'readline';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt function with masked input support
function prompt(question, maskInput = false) {
  return new Promise((resolve) => {
    if (maskInput) {
      // Mask input for sensitive data
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      let input = '';
      process.stdout.write(question);
      
      stdin.on('data', function handler(char) {
        char = char.toString('utf8');
        
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', handler);
            process.stdout.write('\n');
            resolve(input);
            break;
          case '\u0003':
            process.exit();
            break;
          case '\u007f': // Backspace
            input = input.slice(0, -1);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(question + '*'.repeat(input.length));
            break;
          default:
            input += char;
            process.stdout.write('*');
            break;
        }
      });
    } else {
      rl.question(question, resolve);
    }
  });
}

async function main() {
  console.log('🔐 Secure Environment Configuration\n');
  
  // Step 1: Choose environment
  console.log('Available environments:');
  console.log('  1. development');
  console.log('  2. staging');
  console.log('  3. production\n');
  
  const envChoice = await prompt('Which environment do you want to configure? (1-3): ');
  
  const envMap = {
    '1': 'development',
    '2': 'staging',
    '3': 'production'
  };
  
  const environment = envMap[envChoice];
  
  if (!environment) {
    console.error('❌ Invalid choice. Please run the script again and choose 1, 2, or 3.');
    rl.close();
    process.exit(1);
  }
  
  console.log(`\n📝 Configuring ${environment.toUpperCase()} environment\n`);
  
  // Step 2: Get Supabase credentials
  const projectId = await prompt('Supabase Project ID: ');
  const supabaseUrl = await prompt('Supabase URL: ');
  const anonKey = await prompt('Supabase Anon/Publishable Key (input will be masked): ', true);
  
  // Validate inputs
  if (!projectId || !supabaseUrl || !anonKey) {
    console.error('\n❌ All fields are required. Please run the script again.');
    rl.close();
    process.exit(1);
  }
  
  // Validate URL format
  if (!supabaseUrl.startsWith('https://')) {
    console.error('\n❌ Supabase URL must start with https://');
    rl.close();
    process.exit(1);
  }
  
  // Step 3: Build environment file content
  const envContent = `# ${environment.charAt(0).toUpperCase() + environment.slice(1)} Environment
VITE_SUPABASE_PROJECT_ID="${projectId}"
VITE_SUPABASE_URL="${supabaseUrl}"
VITE_SUPABASE_PUBLISHABLE_KEY="${anonKey}"
VITE_AI_INSIGHTS_ENABLED="true"
VITE_ENV="${environment}"
CORS_ALLOW_ORIGIN="${environment === 'production' ? 'https://yourdomain.com' : 'http://localhost:8080,https://lovable.dev,https://lovable-dev.com'}"
`;
  
  // Step 4: Write to file
  const envFilePath = join(rootDir, `.env.${environment}`);
  
  try {
    writeFileSync(envFilePath, envContent, 'utf8');
    console.log(`\n✅ Environment .env.${environment} updated successfully`);
    console.log(`📁 File location: .env.${environment}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Run: node scripts/switch-env.js ${environment}`);
    console.log(`   2. Run: npm run dev`);
  } catch (error) {
    console.error(`\n❌ Failed to write environment file:`, error.message);
    rl.close();
    process.exit(1);
  }
  
  rl.close();
}

main();
