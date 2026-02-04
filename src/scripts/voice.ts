#!/usr/bin/env npx ts-node

/**
 * Voice CLI - Mac Microphone Task Input
 * 
 * Uses macOS microphone to capture voice and process as task utterances.
 * 
 * Usage:
 *   npm run voice              # Single recording (press Enter to stop)
 *   npm run voice --continuous # Keep listening until Ctrl+C
 * 
 * Requirements:
 *   brew install sox   # For audio recording
 */

import 'dotenv/config';
import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import OpenAI from 'openai';
import { processUtterance } from '../tasks/index.js';
import { closePool } from '../lib/db.js';

// ============================================
// CONFIGURATION
// ============================================

const TEMP_DIR = '/tmp/personal-operator-voice';
const SAMPLE_RATE = 16000;
const DEFAULT_USER_ID = process.env.TEST_USER_ID || '8949a988-a1d0-4ceb-8ea5-9b2f120b2444';

let openai: OpenAI;
let sessionId: string | undefined;
let isRecording = false;
let recordProcess: ReturnType<typeof spawn> | null = null;

// ============================================
// SETUP
// ============================================

function checkDependencies(): boolean {
  try {
    execSync('which sox', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('\n❌ sox is not installed. Install it with:');
    console.error('   brew install sox\n');
    return false;
  }
}

function setupTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function getOpenAI(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for voice transcription');
    }
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

// ============================================
// RECORDING
// ============================================

function startRecording(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use sox to record from default microphone
    // -d = default input device
    // -r = sample rate
    // -c = channels (mono)
    // -b = bit depth
    recordProcess = spawn('sox', [
      '-d',                    // Default input
      '-r', String(SAMPLE_RATE),
      '-c', '1',               // Mono
      '-b', '16',              // 16-bit
      outputPath,
      'silence', '1', '0.1', '1%',  // Start recording on sound
      '1', '2.0', '1%',              // Stop after 2s silence
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    recordProcess.on('close', (code) => {
      isRecording = false;
      recordProcess = null;
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Recording failed with code ${code}`));
      }
    });

    recordProcess.on('error', (err) => {
      isRecording = false;
      recordProcess = null;
      reject(err);
    });

    isRecording = true;
  });
}

function stopRecording(): void {
  if (recordProcess) {
    recordProcess.kill('SIGINT');
  }
}

// ============================================
// TRANSCRIPTION
// ============================================

async function transcribe(audioPath: string): Promise<string> {
  const client = getOpenAI();
  
  const audioFile = fs.createReadStream(audioPath);
  
  const response = await client.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: 'en',
  });
  
  return response.text;
}

// ============================================
// PROCESSING
// ============================================

async function processVoiceInput(text: string): Promise<void> {
  console.log(`\n📝 You said: "${text}"`);
  console.log('─'.repeat(50));
  
  try {
    const response = await processUtterance(DEFAULT_USER_ID, {
      text,
      sessionId,
      voiceMetadata: {
        confidence: 0.95,
        isFinal: true,
      },
    });
    
    sessionId = response.sessionId;
    
    const intentEmoji: Record<string, string> = {
      starting: '🆕',
      progress: '📈',
      completed: '✅',
      blocked: '🚫',
      query: '🔍',
      not_task: '💬',
    };
    
    console.log(`${intentEmoji[response.intent] || '•'} Intent: ${response.intent} (${(response.intentConfidence * 100).toFixed(0)}%)`);
    
    if (response.task) {
      console.log(`📋 Task: ${response.task.title}`);
      console.log(`   Status: ${response.task.status}`);
    }
    
    if (response.tasks && response.tasks.length > 0) {
      console.log('\n📋 Your tasks:');
      response.tasks.forEach(t => {
        console.log(`   • [${t.status}] ${t.title}`);
      });
    }
    
    console.log(`\n💬 ${response.message}`);
    
  } catch (error) {
    console.error('Error processing:', error);
  }
}

// ============================================
// MAIN LOOP
// ============================================

async function recordOnce(): Promise<void> {
  const audioPath = path.join(TEMP_DIR, `recording-${Date.now()}.wav`);
  
  console.log('\n🎤 Recording... (speak now, stops after 2s silence)');
  
  try {
    await startRecording(audioPath);
    
    // Check if file was created and has content
    const stats = fs.statSync(audioPath);
    if (stats.size < 1000) {
      console.log('⚠️  No audio detected. Try again.');
      return;
    }
    
    console.log('🔄 Transcribing...');
    const text = await transcribe(audioPath);
    
    if (text.trim()) {
      await processVoiceInput(text);
    } else {
      console.log('⚠️  Could not understand audio. Try again.');
    }
    
    // Cleanup
    fs.unlinkSync(audioPath);
    
  } catch (error) {
    console.error('Recording error:', error);
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  }
}

async function continuousMode(): Promise<void> {
  console.log('\n🎙️  Continuous listening mode');
  console.log('   Speak naturally. Press Ctrl+C to stop.\n');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Stopping...');
    stopRecording();
    rl.close();
    await closePool();
    process.exit(0);
  });
  
  while (true) {
    await recordOnce();
    console.log('\n─'.repeat(50));
  }
}

async function singleMode(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  console.log('\n🎤 Voice Task Input');
  console.log('   Press Enter to start recording, or type a command:\n');
  
  const prompt = () => {
    rl.question('> ', async (input) => {
      if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
        console.log('👋 Bye!');
        rl.close();
        await closePool();
        process.exit(0);
      }
      
      if (input.trim() === '') {
        // Record voice
        await recordOnce();
      } else {
        // Process as text
        await processVoiceInput(input);
      }
      
      prompt();
    });
  };
  
  prompt();
}

// ============================================
// ENTRY POINT
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const continuous = args.includes('--continuous') || args.includes('-c');
  
  console.log('╔════════════════════════════════════════╗');
  console.log('║     🤖 Personal Operator - Voice       ║');
  console.log('╚════════════════════════════════════════╝');
  
  // Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }
  
  setupTempDir();
  
  // Check OpenAI key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required');
    process.exit(1);
  }
  
  console.log('✓ Sox found');
  console.log('✓ OpenAI API ready');
  
  if (continuous) {
    await continuousMode();
  } else {
    await singleMode();
  }
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await closePool();
  process.exit(1);
});

