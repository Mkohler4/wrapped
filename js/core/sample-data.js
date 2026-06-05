// ============================================
// ChatGPT Wrapped - Sample Data Generation
// ============================================

async function loadSampleData() {
  clearError();
  showScreen('processing');
  updateProgress(10, 'Generating sample data...');
  
  await new Promise(r => setTimeout(r, 300));
  updateProgress(30, 'Creating conversations...');
  
  // Generate realistic sample data
  const sampleConversations = generateSampleConversations();
  
  await new Promise(r => setTimeout(r, 300));
  updateProgress(50, 'Analyzing patterns...');
  
  // Use the same analysis pipeline as file uploads — no hardcoded values
  stats = analyzeConversations(sampleConversations);
  syncDebugGlobals();
  
  updateProgress(60, 'Extracting themes...');
  stats.enhanced = generateEnhancedAnalysis(sampleConversations);
  syncDebugGlobals();
  
  discoveredThemes = generateDiscoveredThemes(stats, sampleConversations);
  syncDebugGlobals();
  
  updateProgress(70, 'Extracting vocabulary...');
  stats.topWords = extractTopWords(sampleConversations);
  syncDebugGlobals();
  
  updateProgress(80, 'Mapping activity...');
  heatmapData = generateHeatmapData(sampleConversations);
  syncDebugGlobals();

  // Wire heatmap streak/activity data into stats for achievements
  if (heatmapData && heatmapData.stats) {
    stats.enhanced.longestStreak = heatmapData.stats.longestStreak;
    stats.enhanced.totalActiveDays = heatmapData.stats.activeDays;
    stats.streaks = {
      longestStreak: heatmapData.stats.longestStreak,
      totalActiveDays: heatmapData.stats.activeDays,
    };
    syncDebugGlobals();
  }
  
  updateProgress(90, 'Generating insights...');
  aiInsights = generateDataInsights(stats, sampleConversations);
  syncDebugGlobals();
  
  await new Promise(r => setTimeout(r, 200));
  updateProgress(100, 'Done!');
  
  await new Promise(r => setTimeout(r, 300));
  populateSlides(stats);
  showScreen('wrapped');
}

function generateSampleConversations() {
  const topics = [
    { title: 'Debug React useEffect infinite loop', topic: 'coding' },
    { title: 'Explain async/await in JavaScript', topic: 'coding' },
    { title: 'Write email to client about delay', topic: 'writing' },
    { title: 'Python list comprehension examples', topic: 'coding' },
    { title: 'How does HTTP caching work?', topic: 'learning' },
    { title: 'Blog post about AI trends', topic: 'writing' },
    { title: 'Fix TypeScript type error', topic: 'coding' },
    { title: 'Product roadmap planning', topic: 'planning' },
    { title: 'API design best practices', topic: 'coding' },
    { title: 'Write LinkedIn post', topic: 'writing' },
    { title: 'Compare React vs Vue', topic: 'learning' },
    { title: 'Database schema design', topic: 'coding' },
    { title: 'Project timeline estimation', topic: 'planning' },
    { title: 'CSS flexbox vs grid', topic: 'learning' },
    { title: 'Code review feedback', topic: 'writing' },
  ];

  const conversations = [];
  const now = Date.now() / 1000;
  const yearAgo = now - (365 * 24 * 60 * 60);

  for (let i = 0; i < 847; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const timestamp = yearAgo + Math.random() * (now - yearAgo);
    const messageCount = Math.floor(Math.random() * 20) + 2;
    
    const mapping = {};
    let hasCode = topic.topic === 'coding' && Math.random() > 0.3;
    
    for (let j = 0; j < messageCount; j++) {
      const msgId = `msg-${i}-${j}`;
      const isUser = j % 2 === 0;
      const msgTime = timestamp + (j * 60);
      
      mapping[msgId] = {
        id: msgId,
        message: {
          id: msgId,
          author: { role: isUser ? 'user' : 'assistant' },
          content: {
            content_type: 'text',
            parts: [isUser && hasCode && j === 0 ? '```javascript\nconst x = 1;\n```' : 'Sample message text']
          },
          create_time: msgTime
        },
        parent: j > 0 ? `msg-${i}-${j-1}` : null,
        children: j < messageCount - 1 ? [`msg-${i}-${j+1}`] : []
      };
    }

    conversations.push({
      title: topic.title + (i > 15 ? ` #${i}` : ''),
      create_time: timestamp,
      mapping,
      current_node: `msg-${i}-${messageCount - 1}`
    });
  }

  return conversations;
}

// Make functions globally available for onclick handlers
window.loadSampleData = loadSampleData;
