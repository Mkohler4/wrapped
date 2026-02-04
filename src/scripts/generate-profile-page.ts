#!/usr/bin/env tsx
/**
 * Generate Interactive Profile Page
 * 
 * Creates an HTML page showing:
 * - Personal profile data from user.json
 * - Analyzed profile from conversations
 * - Sample images from conversations
 * - Timeline of activity
 * - Freshness indicators for data
 * 
 * Usage:
 *   npm run profile:html ./path/to/export.zip
 *   npm run profile:html ./path/to/export.zip --output ./profile.html
 */

import 'dotenv/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import JSZip from 'jszip';
import { checkConnection, closePool, query } from '../lib/db';

// ============================================
// TYPES
// ============================================

interface UserInfo {
  id: string;
  email: string;
  chatgpt_plus_user: boolean;
  phone_number?: string;
}

interface ImageFile {
  filename: string;
  path: string;
  size: number;
  data?: Buffer;
}

interface ConversationStats {
  total: number;
  byMonth: { month: string; count: number }[];
  topTopics: { topic: string; count: number }[];
  recentConversations: { subject: string; date: Date; messageCount: number }[];
}

interface ProfileData {
  user: UserInfo;
  images: ImageFile[];
  stats: ConversationStats;
  generatedProfile?: any;
  exportDate: Date;
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const zipPath = args.find(a => !a.startsWith('--'));
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : './profile-page.html';
  const maxImages = 20;

  if (!zipPath) {
    console.error('Usage: npm run profile:html <path-to-export.zip> [--output path.html]');
    process.exit(1);
  }

  console.log('Generate Profile Page');
  console.log('=====================\n');

  // Check database
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is required');
    process.exit(1);
  }

  const dbOk = await checkConnection();
  if (!dbOk) {
    console.error('Error: Could not connect to database');
    process.exit(1);
  }

  try {
    // Step 1: Load ZIP and extract data
    console.log('Step 1: Loading export ZIP...');
    const zipData = await fs.readFile(zipPath);
    const zip = await JSZip.loadAsync(zipData);

    // Step 2: Extract user info
    console.log('Step 2: Extracting user info...');
    const userFile = zip.file('user.json');
    if (!userFile) {
      throw new Error('user.json not found');
    }
    const user: UserInfo = JSON.parse(await userFile.async('string'));
    console.log(`  Email: ${user.email}`);

    // Step 3: Extract sample images
    console.log('Step 3: Extracting sample images...');
    const images: ImageFile[] = [];
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    
    for (const [filepath, file] of Object.entries(zip.files)) {
      if (file.dir) continue;
      const ext = path.extname(filepath).toLowerCase();
      if (imageExtensions.includes(ext)) {
        images.push({
          filename: path.basename(filepath),
          path: filepath,
          size: file._data?.uncompressedSize || 0,
        });
      }
    }
    console.log(`  Found ${images.length} images`);

    // Extract a sample of images (most recent by filename)
    const sampleImages = images.slice(0, maxImages);
    for (const img of sampleImages) {
      const file = zip.file(img.path);
      if (file) {
        img.data = await file.async('nodebuffer');
      }
    }
    console.log(`  Loaded ${sampleImages.length} sample images`);

    // Step 4: Get conversation stats from database
    console.log('Step 4: Loading conversation stats from database...');
    const stats = await getConversationStats();
    console.log(`  ${stats.total} conversations`);

    // Step 5: Load generated profile if exists
    let generatedProfile = null;
    const profilePath = path.resolve('./docs/my-profile.md');
    try {
      const profileContent = await fs.readFile(profilePath, 'utf-8');
      generatedProfile = parseProfileMarkdown(profileContent);
      console.log('  Loaded generated profile');
    } catch {
      console.log('  No generated profile found (run profile:analyze first)');
    }

    // Step 6: Generate HTML
    console.log('Step 5: Generating HTML...');
    const profileData: ProfileData = {
      user,
      images: sampleImages,
      stats,
      generatedProfile,
      exportDate: new Date(),
    };

    const html = generateHTML(profileData);
    
    const fullOutputPath = path.resolve(outputPath);
    await fs.writeFile(fullOutputPath, html);
    console.log(`\n✅ Profile page generated: ${fullOutputPath}`);
    console.log(`   Open in browser: file://${fullOutputPath}`);

  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// ============================================
// DATABASE QUERIES
// ============================================

async function getConversationStats(): Promise<ConversationStats> {
  // Total conversations
  const totalResult = await query<{ count: string }>(`
    SELECT COUNT(*) as count FROM threads WHERE source = 'chatgpt'
  `);
  const total = parseInt(totalResult.rows[0].count);

  // By month
  const byMonthResult = await query<{ month: string; count: string }>(`
    SELECT 
      TO_CHAR(first_event_at, 'YYYY-MM') as month,
      COUNT(*) as count
    FROM threads 
    WHERE source = 'chatgpt'
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
  `);
  const byMonth = byMonthResult.rows.map(r => ({
    month: r.month,
    count: parseInt(r.count),
  }));

  // Top topics
  const topicsResult = await query<{ topic: string; count: string }>(`
    SELECT 
      unnest(topic_tags) as topic,
      COUNT(*) as count
    FROM events
    WHERE source = 'chatgpt' AND array_length(topic_tags, 1) > 0
    GROUP BY topic
    ORDER BY count DESC
    LIMIT 10
  `);
  const topTopics = topicsResult.rows.map(r => ({
    topic: r.topic,
    count: parseInt(r.count),
  }));

  // Recent conversations
  const recentResult = await query<{ subject: string; date: Date; message_count: string }>(`
    SELECT 
      subject,
      first_event_at as date,
      event_count as message_count
    FROM threads
    WHERE source = 'chatgpt'
    ORDER BY first_event_at DESC
    LIMIT 10
  `);
  const recentConversations = recentResult.rows.map(r => ({
    subject: r.subject || '(untitled)',
    date: r.date,
    messageCount: parseInt(r.message_count),
  }));

  return { total, byMonth, topTopics, recentConversations };
}

// ============================================
// PROFILE PARSING
// ============================================

function parseProfileMarkdown(content: string): any {
  // Simple extraction of key sections
  const sections: any = {};
  
  const summaryMatch = content.match(/## Summary\n\n([^\n]+)/);
  if (summaryMatch) sections.summary = summaryMatch[1];

  const roleMatch = content.match(/\*\*Role\*\* \| ([^\n|]+)/);
  if (roleMatch) sections.role = roleMatch[1].trim();

  const companyMatch = content.match(/\*\*Company\*\* \| ([^\n|]+)/);
  if (companyMatch) sections.company = companyMatch[1].trim();

  const skillsMatch = content.match(/### Skills\n([\s\S]*?)(?=\n###|\n---)/);
  if (skillsMatch) {
    sections.skills = skillsMatch[1]
      .split('\n')
      .filter(l => l.startsWith('- '))
      .map(l => l.slice(2).trim());
  }

  const languagesMatch = content.match(/### Languages\n([\s\S]*?)(?=\n###|\n---)/);
  if (languagesMatch) {
    sections.languages = languagesMatch[1]
      .split('\n')
      .filter(l => l.startsWith('- '))
      .map(l => l.slice(2).trim());
  }

  const insightsMatch = content.match(/## Key Insights[\s\S]*?\n\n([\s\S]*?)(?=\n---)/);
  if (insightsMatch) {
    sections.insights = insightsMatch[1]
      .split('\n')
      .filter(l => /^\d+\./.test(l))
      .map(l => l.replace(/^\d+\.\s*/, '').trim());
  }

  return sections;
}

// ============================================
// HTML GENERATION
// ============================================

function generateHTML(data: ProfileData): string {
  const { user, images, stats, generatedProfile, exportDate } = data;

  // Calculate freshness
  const daysSinceExport = Math.floor((Date.now() - exportDate.getTime()) / (1000 * 60 * 60 * 24));
  const freshness = daysSinceExport < 7 ? 'fresh' : daysSinceExport < 30 ? 'recent' : 'stale';

  // Generate image gallery HTML
  const imageGalleryHTML = images
    .filter(img => img.data)
    .map(img => {
      const base64 = img.data!.toString('base64');
      const ext = path.extname(img.filename).toLowerCase().slice(1);
      const mimeType = ext === 'jpg' ? 'jpeg' : ext;
      return `<div class="image-card">
        <img src="data:image/${mimeType};base64,${base64}" alt="${img.filename}" loading="lazy">
        <span class="image-name">${img.filename.slice(0, 20)}...</span>
      </div>`;
    })
    .join('\n');

  // Generate topic chart data
  const topicChartData = stats.topTopics.slice(0, 8).map(t => ({
    label: t.topic,
    value: t.count,
  }));

  // Generate activity chart data
  const activityData = stats.byMonth.slice(0, 12).reverse();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personal Profile - ${user.email}</title>
  <style>
    :root {
      --bg-primary: #0f0f0f;
      --bg-secondary: #1a1a1a;
      --bg-card: #242424;
      --text-primary: #e5e5e5;
      --text-secondary: #a0a0a0;
      --accent: #6366f1;
      --accent-hover: #818cf8;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --border: #333;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    header {
      text-align: center;
      padding: 3rem 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 2rem;
    }

    header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, var(--accent), #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    header .subtitle {
      color: var(--text-secondary);
      font-size: 1.1rem;
    }

    .freshness-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 1rem;
    }

    .freshness-badge.fresh { background: var(--success); color: #000; }
    .freshness-badge.recent { background: var(--warning); color: #000; }
    .freshness-badge.stale { background: var(--danger); color: #fff; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .card {
      background: var(--bg-card);
      border-radius: 12px;
      padding: 1.5rem;
      border: 1px solid var(--border);
    }

    .card h2 {
      font-size: 1rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card h2::before {
      content: '';
      display: block;
      width: 4px;
      height: 1em;
      background: var(--accent);
      border-radius: 2px;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--accent);
    }

    .stat-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      color: var(--text-secondary);
    }

    .info-value {
      color: var(--text-primary);
      font-weight: 500;
    }

    .tag {
      display: inline-block;
      background: var(--bg-secondary);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      margin: 0.25rem;
      border: 1px solid var(--border);
    }

    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    .topic-bar {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .topic-label {
      width: 100px;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .topic-bar-fill {
      flex: 1;
      height: 24px;
      background: var(--bg-secondary);
      border-radius: 4px;
      overflow: hidden;
    }

    .topic-bar-inner {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), #a855f7);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      font-size: 0.75rem;
      font-weight: 600;
      min-width: 30px;
    }

    .image-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.75rem;
    }

    .image-card {
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      position: relative;
      border: 1px solid var(--border);
    }

    .image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.2s;
    }

    .image-card:hover img {
      transform: scale(1.05);
    }

    .image-name {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.8);
      font-size: 0.65rem;
      padding: 0.25rem;
      text-align: center;
      opacity: 0;
      transition: opacity 0.2s;
    }

    .image-card:hover .image-name {
      opacity: 1;
    }

    .activity-chart {
      display: flex;
      align-items: flex-end;
      height: 120px;
      gap: 4px;
      padding-top: 1rem;
    }

    .activity-bar {
      flex: 1;
      background: linear-gradient(180deg, var(--accent), transparent);
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      position: relative;
    }

    .activity-bar:hover::after {
      content: attr(data-label);
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-card);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      white-space: nowrap;
      border: 1px solid var(--border);
    }

    .recent-list {
      list-style: none;
    }

    .recent-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .recent-item:last-child {
      border-bottom: none;
    }

    .recent-title {
      font-weight: 500;
      color: var(--text-primary);
    }

    .recent-meta {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .insight-list {
      list-style: none;
    }

    .insight-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
      display: flex;
      gap: 0.75rem;
    }

    .insight-item:last-child {
      border-bottom: none;
    }

    .insight-number {
      width: 24px;
      height: 24px;
      background: var(--accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .wide-card {
      grid-column: 1 / -1;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 2rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border);
    }

    footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.85rem;
      border-top: 1px solid var(--border);
      margin-top: 2rem;
    }

    @media (max-width: 768px) {
      .container {
        padding: 1rem;
      }
      
      header h1 {
        font-size: 1.75rem;
      }
      
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Personal Profile</h1>
      <p class="subtitle">${user.email}</p>
      <span class="freshness-badge ${freshness}">
        ${freshness === 'fresh' ? '✓ Data is current' : freshness === 'recent' ? '⚠ Updated recently' : '⚠ May be outdated'}
      </span>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Account Info</h2>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">${user.email}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Phone</span>
          <span class="info-value">${user.phone_number || 'Not set'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">ChatGPT Plus</span>
          <span class="info-value">${user.chatgpt_plus_user ? '✓ Active' : 'No'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">User ID</span>
          <span class="info-value" style="font-size: 0.75rem; font-family: monospace;">${user.id}</span>
        </div>
      </div>

      <div class="card">
        <h2>Conversation Stats</h2>
        <div class="stat-value">${stats.total.toLocaleString()}</div>
        <div class="stat-label">Total Conversations</div>
        <div style="margin-top: 1rem;">
          <div class="info-row">
            <span class="info-label">Messages</span>
            <span class="info-value">~${(stats.total * 15).toLocaleString()}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Images Uploaded</span>
            <span class="info-value">${data.images.length > 0 ? images.length + '+' : '0'}</span>
          </div>
        </div>
      </div>

      ${generatedProfile ? `
      <div class="card">
        <h2>Professional</h2>
        <div class="info-row">
          <span class="info-label">Role</span>
          <span class="info-value">${generatedProfile.role || 'Unknown'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Company</span>
          <span class="info-value">${generatedProfile.company || 'Unknown'}</span>
        </div>
        ${generatedProfile.skills ? `
        <div style="margin-top: 1rem;">
          <span class="info-label">Skills</span>
          <div class="tag-list">
            ${generatedProfile.skills.slice(0, 6).map((s: string) => `<span class="tag">${s}</span>`).join('')}
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${generatedProfile?.languages ? `
      <div class="card">
        <h2>Technical</h2>
        <div style="margin-bottom: 1rem;">
          <span class="info-label">Languages</span>
          <div class="tag-list">
            ${generatedProfile.languages.map((l: string) => `<span class="tag">${l}</span>`).join('')}
          </div>
        </div>
      </div>
      ` : ''}
    </div>

    <h3 class="section-title">Topic Distribution</h3>
    <div class="card">
      ${topicChartData.map(t => {
        const maxCount = Math.max(...topicChartData.map(x => x.value));
        const percent = (t.value / maxCount) * 100;
        return `
        <div class="topic-bar">
          <span class="topic-label">${t.label}</span>
          <div class="topic-bar-fill">
            <div class="topic-bar-inner" style="width: ${percent}%">${t.value}</div>
          </div>
        </div>
        `;
      }).join('')}
    </div>

    <h3 class="section-title">Activity Over Time</h3>
    <div class="card">
      <div class="activity-chart">
        ${activityData.map(d => {
          const maxCount = Math.max(...activityData.map(x => x.count));
          const height = (d.count / maxCount) * 100;
          return `<div class="activity-bar" style="height: ${Math.max(height, 5)}%" data-label="${d.month}: ${d.count} convos"></div>`;
        }).join('')}
      </div>
      <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.7rem; color: var(--text-secondary);">
        <span>${activityData[0]?.month || ''}</span>
        <span>${activityData[activityData.length - 1]?.month || ''}</span>
      </div>
    </div>

    ${images.length > 0 ? `
    <h3 class="section-title">Uploaded Images (Sample)</h3>
    <div class="card">
      <div class="image-gallery">
        ${imageGalleryHTML}
      </div>
      <p style="margin-top: 1rem; font-size: 0.85rem; color: var(--text-secondary);">
        Showing ${images.length} of 470+ images
      </p>
    </div>
    ` : ''}

    <h3 class="section-title">Recent Conversations</h3>
    <div class="card">
      <ul class="recent-list">
        ${stats.recentConversations.map(c => `
        <li class="recent-item">
          <div>
            <div class="recent-title">${escapeHtml(c.subject)}</div>
            <div class="recent-meta">${c.messageCount} messages</div>
          </div>
          <span class="recent-meta">${new Date(c.date).toLocaleDateString()}</span>
        </li>
        `).join('')}
      </ul>
    </div>

    ${generatedProfile?.insights ? `
    <h3 class="section-title">AI Insights</h3>
    <div class="card">
      <ul class="insight-list">
        ${generatedProfile.insights.slice(0, 8).map((insight: string, i: number) => `
        <li class="insight-item">
          <span class="insight-number">${i + 1}</span>
          <span>${insight}</span>
        </li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <footer>
      <p>Generated ${new Date().toLocaleString()} • Data exported ${exportDate.toLocaleDateString()}</p>
      <p style="margin-top: 0.5rem;">Personal Operator Assistant</p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

main();

