// ============================================
// ChatGPT Wrapped - Conversation Analysis
// ============================================
// TODO: Replace this with shared module from src/lib/chatgpt-stats.ts
// Existing code to reuse:
//   - src/ingest/chatgpt/parser.ts (ZIP/JSON parsing)
//   - src/scripts/generate-profile-page.ts (topic classification)
//   - src/ingest/chatgpt/insights.ts (style analysis)
// This is a PROTOTYPE - real impl should import existing code

function analyzeConversations(data) {
  const conversations = Array.isArray(data) ? data : [];
  
  let totalMessages = 0;
  let userMessages = 0;
  const topicCounts = {};
  const hourCounts = new Array(24).fill(0);
  let longestConvo = { title: '', count: 0 };
  let codeBlocks = 0;
  let images = 0;

  for (const convo of conversations) {
    const messages = convo.mapping ? Object.values(convo.mapping) : [];
    let convoMsgCount = 0;

    for (const node of messages) {
      if (!node.message) continue;
      
      const msg = node.message;
      const role = msg.author?.role;
      const text = msg.content?.parts?.join('') || '';

      totalMessages++;
      if (role === 'user') {
        userMessages++;
        convoMsgCount++;
        
        // Count code blocks
        if (text.includes('```')) codeBlocks++;
        
        // Check for images
        if (msg.content?.content_type === 'image_asset_pointer') images++;
      }

      // Hour of day
      if (msg.create_time) {
        const hour = new Date(msg.create_time * 1000).getHours();
        hourCounts[hour]++;
      }
    }

    // Topic classification (simple)
    const title = (convo.title || '').toLowerCase();
    let topic = 'general';
    if (title.match(/code|function|api|bug|error|typescript|javascript|python|react/i)) topic = 'coding';
    else if (title.match(/write|email|blog|article|copy/i)) topic = 'writing';
    else if (title.match(/learn|explain|how|what|why/i)) topic = 'learning';
    else if (title.match(/plan|strategy|roadmap|todo/i)) topic = 'planning';
    
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;

    // Longest conversation
    if (convoMsgCount > longestConvo.count) {
      longestConvo = { title: convo.title || 'Untitled', count: convoMsgCount };
    }
  }

  // Sort topics
  const sortedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Peak hour
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    totalConversations: conversations.length,
    totalMessages,
    userMessages,
    topics: sortedTopics,
    peakHour,
    hourCounts,
    longestConvo,
    codeBlocks,
    images,
  };
}

