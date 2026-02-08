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
  let earliestTimestamp = Infinity;

  for (const convo of conversations) {
    const messages = convo.mapping ? Object.values(convo.mapping) : [];
    let convoMsgCount = 0;

    // Track earliest conversation create_time for OG achievement
    if (convo.create_time && convo.create_time < earliestTimestamp) {
      earliestTimestamp = convo.create_time;
    }

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
      }

      // Check for images — multiple content structures (any role)
      let isImage = false;

      if (msg.content?.content_type === 'image_asset_pointer') {
        isImage = true;
      }

      if (msg.content?.content_type === 'multimodal_text' && msg.content.parts) {
        for (const part of msg.content.parts) {
          if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
            isImage = true;
            break;
          }
        }
      }

      if (msg.metadata?.dalle?.prompt) {
        isImage = true;
      }

      if (msg.metadata?.attachments?.length > 0) {
        const hasImageAttachment = msg.metadata.attachments.some(att =>
          att.mime_type?.startsWith('image/') ||
          att.name?.match(/\.(png|jpg|jpeg|gif|webp)$/i)
        );
        if (hasImageAttachment) isImage = true;
      }

      if (isImage) images++;

      // Hour of day
      if (msg.create_time) {
        const hour = new Date(msg.create_time * 1000).getHours();
        hourCounts[hour]++;
      }
    }

    // Topic classification (expanded)
    const topic = classifyConversation(convo);
    
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
    firstDate: earliestTimestamp < Infinity ? new Date(earliestTimestamp * 1000).toISOString() : null,
  };
}

// ============================================
// TOPIC CLASSIFICATION (50 CATEGORIES)
// ============================================

const topicPatterns = [
  { topic: 'coding', pattern: /code|function|api|bug|error|debug|typescript|javascript|python|java\b|c\+\+|c#|go\b|rust|ruby|php|node|express|framework|library|sdk|algorithm|data.?structure|class|interface|module|import|async|await|promise/i },
  { topic: 'web-dev', pattern: /html|css|dom|frontend|backend|full.?stack|browser|webpack|vite|next\.js|nuxt|react|vue|angular|svelte|tailwind|bootstrap/i },
  { topic: 'mobile-dev', pattern: /android|ios|swift|kotlin|react.?native|flutter|xcode|apk|play store|app store/i },
  { topic: 'data-analytics', pattern: /data|analytics|dashboard|chart|graph|visualization|excel|spreadsheet|csv|pandas|numpy|matplotlib|power.?bi|tableau|looker|report/i },
  { topic: 'ai-ml', pattern: /\bai\b|artificial.?intelligence|machine.?learning|deep.?learning|neural|gpt|chatgpt|llm|language.?model|prompt|token|embedding|vector|rag|fine.?tune|transformer/i },
  { topic: 'devops', pattern: /devops|ci\/?cd|pipeline|build|deploy|release|github.?actions|gitlab.?ci|jenkins|docker|kubernetes|helm|terraform|ansible/i },
  { topic: 'cloud', pattern: /aws|azure|gcp|cloud|lambda|ec2|s3|cloudfront|vpc|iam|serverless|cloud run|cloud function/i },
  { topic: 'security', pattern: /security|vulnerability|xss|csrf|oauth|jwt|auth|token|encrypt|decrypt|hash|penetration|threat|incident|malware/i },
  { topic: 'database', pattern: /sql|database|postgres|mysql|sqlite|mongodb|redis|schema|query|index|migration|orm|prisma|typeorm/i },
  { topic: 'testing-qa', pattern: /test|testing|unit test|integration test|e2e|jest|mocha|cypress|playwright|vitest|qa|bug report/i },
  { topic: 'performance', pattern: /performance|optimi[sz]e|latency|throughput|cache|profiling|bottleneck|slow|memory leak/i },
  { topic: 'architecture', pattern: /architecture|design pattern|system design|scalability|microservice|monolith|event.?driven|queue|kafka|pub\/sub/i },
  { topic: 'ux-ui', pattern: /ux|ui|user experience|user interface|wireframe|prototype|figma|design system|accessibility|a11y/i },
  { topic: 'product', pattern: /product|roadmap|feature|mvp|user story|backlog|prioritization|product discovery|persona/i },
  { topic: 'business', pattern: /business|startup|company|entrepreneur|founder|revenue|profit|pricing|strategy|kpi|roi|market fit/i },
  { topic: 'marketing', pattern: /marketing|seo|content marketing|campaign|brand|growth|acquisition|retention|ad copy|ads|newsletter/i },
  { topic: 'sales', pattern: /sales|lead|pipeline|crm|prospect|close|demo|pricing call|quota|negotiation/i },
  { topic: 'customer-support', pattern: /support|customer success|ticket|helpdesk|faq|sla|refund|complaint|onboarding/i },
  { topic: 'finance', pattern: /finance|budget|cash flow|accounting|invoice|expense|tax|balance sheet|profit and loss|p\&l/i },
  { topic: 'crypto', pattern: /crypto|bitcoin|ethereum|blockchain|web3|wallet|token|defi|nft|smart contract/i },
  { topic: 'legal', pattern: /legal|contract|agreement|terms|compliance|privacy|gdpr|hipaa|copyright|trademark|policy/i },
  { topic: 'hr-people', pattern: /hr|human resources|hiring|recruit|interview|candidate|onboarding|performance review|compensation/i },
  { topic: 'education', pattern: /education|learning|course|tutorial|lesson|curriculum|teach|classroom|homework|exam|quiz/i },
  { topic: 'math', pattern: /math|algebra|calculus|geometry|trigonometry|statistics|probability|equation|theorem/i },
  { topic: 'science', pattern: /science|scientific|experiment|research|hypothesis|lab|methodology/i },
  { topic: 'physics', pattern: /physics|quantum|relativity|mechanics|thermodynamics|optics|particle/i },
  { topic: 'chemistry', pattern: /chemistry|chemical|molecule|reaction|organic|inorganic|stoichiometry|periodic table/i },
  { topic: 'biology', pattern: /biology|genetics|cell|microbiology|evolution|anatomy|physiology|biotech/i },
  { topic: 'astronomy', pattern: /astronomy|space|planet|star|galaxy|telescope|nasa|astrophysics/i },
  { topic: 'history', pattern: /history|historical|ancient|medieval|war|civilization|timeline/i },
  { topic: 'philosophy', pattern: /philosophy|ethics|epistemology|metaphysics|logic|stoic|existential/i },
  { topic: 'politics', pattern: /politics|policy|government|election|campaign|democracy|legislation|geopolitics/i },
  { topic: 'economics', pattern: /economics|macro|micro|inflation|interest rate|gdp|recession|market economy/i },
  { topic: 'language-learning', pattern: /language learning|translate|translation|grammar|vocabulary|fluency|spanish|french|japanese|korean|german/i },
  { topic: 'writing', pattern: /write|rewrite|edit|proofread|email|blog|article|copy|draft|outline|resume|cover letter|linkedin/i },
  { topic: 'creative', pattern: /creative|story|fiction|poem|poetry|character|world.?build|plot|narrative|screenplay/i },
  { topic: 'design', pattern: /design|logo|brand|color|palette|layout|typography|illustration|icon|graphic/i },
  { topic: 'music-audio', pattern: /music|audio|sound|song|lyrics|mixing|mastering|podcast|voice|synth/i },
  { topic: 'video-media', pattern: /video|film|editing|premiere|after effects|motion graphics|animation|storyboard/i },
  { topic: 'photography', pattern: /photo|photography|camera|lens|exposure|iso|shutter|lightroom|composition/i },
  { topic: 'gaming', pattern: /game|gaming|unity|unreal|gameplay|level design|quest|npc|fps|rpg/i },
  { topic: 'hardware', pattern: /hardware|cpu|gpu|ram|motherboard|firmware|driver|device|embedded/i },
  { topic: 'iot', pattern: /iot|internet of things|sensor|raspberry pi|arduino|edge device|mqtt/i },
  { topic: 'robotics', pattern: /robot|robotics|autonomous|drone|control system|slam|actuator/i },
  { topic: 'travel', pattern: /travel|trip|itinerary|flight|hotel|visa|backpacking|tourism/i },
  { topic: 'food-cooking', pattern: /food|cook|cooking|recipe|bake|kitchen|nutrition|meal prep/i },
  { topic: 'health-fitness', pattern: /health|fitness|workout|exercise|gym|nutrition|diet|calorie|sleep|wellness/i },
  { topic: 'mental-health', pattern: /mental health|anxiety|stress|therapy|mindfulness|meditation|burnout|self care/i },
  { topic: 'relationships', pattern: /relationship|dating|marriage|family|parenting|friendship|communication|breakup/i },
  { topic: 'productivity', pattern: /productivity|time management|todo|task|habit|routine|focus|prioritization|workflow/i }
];

function classifyConversation(convo) {
  const title = (convo.title || '').toLowerCase();
  const messages = convo.mapping ? Object.values(convo.mapping) : [];
  const userMessages = messages
    .filter(m => m.message?.author?.role === 'user')
    .slice(0, 3)
    .map(m => (m.message.content?.parts?.join(' ') || '').toLowerCase())
    .join(' ');

  const fullText = `${title} ${userMessages}`.trim();
  if (!fullText) return 'general';

  let bestTopic = 'general';
  let bestScore = 0;

  for (const { topic, pattern } of topicPatterns) {
    const matches = fullText.match(pattern);
    const score = matches ? matches.length : 0;
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  return bestScore > 0 ? bestTopic : 'general';
}

// ============================================
// ENHANCED ANALYSIS
// ============================================

function generateEnhancedAnalysis(conversations) {
  const monthlyData = {};
  const now = new Date();
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    monthlyData[key] = 0;
  }
  
  const topicsOverTime = { old: {}, recent: {} };
  const daysOfWeek = [0, 0, 0, 0, 0, 0, 0];
  let convCount = 0;
  let marathonCount = 0;
  let quickCount = 0;
  let mostProductiveDay = null;
  let maxDayCount = 0;
  
  for (const conv of conversations) {
    if (!conv.create_time) continue;
    const date = new Date(conv.create_time * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;
    
    if (monthlyData.hasOwnProperty(key)) {
      monthlyData[key]++;
      convCount++;
    }
    
    const dayOfWeek = date.getDay();
    daysOfWeek[dayOfWeek]++;
    if (daysOfWeek[dayOfWeek] > maxDayCount) {
      maxDayCount = daysOfWeek[dayOfWeek];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      mostProductiveDay = dayNames[dayOfWeek];
    }
    
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    const userMsgCount = messages.filter(m => m.message?.author?.role === 'user').length;
    if (userMsgCount >= 50) marathonCount++;
    if (userMsgCount < 5) quickCount++;
    
    const topic = classifyConversation(conv);
    
    const isOld = date < new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const bucket = isOld ? topicsOverTime.old : topicsOverTime.recent;
    bucket[topic] = (bucket[topic] || 0) + 1;
  }
  
  const weekdayCount = daysOfWeek.slice(1, 6).reduce((a, b) => a + b, 0);
  const weekendCount = daysOfWeek[0] + daysOfWeek[6];
  const weekendRatio = weekdayCount + weekendCount > 0 
    ? Math.round((weekendCount / (weekdayCount + weekendCount)) * 100) 
    : 0;
  
  const oldTopics = Object.entries(topicsOverTime.old)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
  
  const recentTopics = Object.entries(topicsOverTime.recent)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
  
  const monthlyTrend = Object.entries(monthlyData).map(([key, count]) => {
    const [year, month] = key.split('-');
    const date = new Date(year, parseInt(month) - 1, 1);
    return {
      month: date.toLocaleString('default', { month: 'short' }),
      count,
      date
    };
  });
  
  const firstHalf = monthlyTrend.slice(0, 6).reduce((sum, m) => sum + (m.count ?? 0), 0);
  const secondHalf = monthlyTrend.slice(6).reduce((sum, m) => sum + (m.count ?? 0), 0);
  const trendDirection = ((secondHalf - firstHalf) / (firstHalf || 1)) * 100;
  
  return {
    topicsOld: oldTopics,
    topicsRecent: recentTopics,
    monthlyTrend,
    trendDirection: Math.round(trendDirection),
    nightOwlScore: calculateNightOwlScore(conversations),
    marathonConvos: marathonCount,
    quickConvos: quickCount,
    mostProductiveDay: mostProductiveDay || 'Monday',
    weekendRatio: weekendRatio
  };
}

function calculateNightOwlScore(conversations) {
  const nightHours = [22, 23, 0, 1, 2, 3, 4, 5];
  let nightMessages = 0;
  let totalMessages = 0;
  
  for (const conv of conversations) {
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of messages) {
      if (!node.message || node.message.author?.role !== 'user') continue;
      totalMessages++;
      
      if (node.message.create_time) {
        const hour = new Date(node.message.create_time * 1000).getHours();
        if (nightHours.includes(hour)) nightMessages++;
      }
    }
  }
  
  return totalMessages > 0 ? Math.round((nightMessages / totalMessages) * 100) : 0;
}

function extractTopWords(conversations) {
  const wordFreq = {};
  const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'is', 'are', 'was', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how']);
  
  for (const conv of conversations) {
    const title = (conv.title || '').toLowerCase();
    const words = title.split(/\W+/).filter(w => w.length > 3 && !stopwords.has(w));
    
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
    
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of messages) {
      if (!node.message || node.message.author?.role !== 'user') continue;
      const text = node.message.content?.parts?.join(' ') || '';
      const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 4 && !stopwords.has(w));
      
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }
  }
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

function generateDiscoveredThemes(stats, conversations) {
  const themePatterns = {
    'Learning & Education': /learn|tutorial|explain|how|understand|teach|course|study|guide/i,
    'Creative Writing': /write|article|blog|story|narrative|script|poem|fiction|novel/i,
    'Technical Architecture': /architecture|design|system|pattern|structure|framework|implementation/i,
    'Business & Entrepreneurship': /business|startup|entrepreneurship|company|team|management|leadership|strategy/i,
    'AI Image Generation': /image|visual|generate|dall|midjourney|artwork|design|creative/i,
    'Career & Growth': /career|job|interview|resume|opportunity|growth|skill|development|promotion/i,
    'Productivity & Organization': /productivity|organize|organize|todo|task|schedule|plan|time management/i,
    'Personal Life': /personal|relationship|family|health|hobby|lifestyle|hobby|interest/i
  };
  
  const themeCounts = {};
  
  for (const conv of conversations) {
    const title = conv.title || '';
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    let messageText = title;
    
    for (const node of messages) {
      if (node.message?.content?.parts) {
        messageText += ' ' + node.message.content.parts.join(' ');
      }
    }
    
    for (const [themeName, pattern] of Object.entries(themePatterns)) {
      if (pattern.test(messageText)) {
        themeCounts[themeName] = (themeCounts[themeName] || 0) + messages.length;
      }
    }
  }
  
  return Object.entries(themeCounts)
    .map(([name, messageCount]) => ({ name, messageCount }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 6);
}

function generateHeatmapData(conversations) {
  const dailyActivity = {};
  let earliestDate = new Date();
  let latestDate = new Date();
  let messagesByHour = new Array(24).fill(0);
  let busiestDay = { date: null, count: 0 };
  let maxCount = 0;
  
  for (const conv of conversations) {
    const messages = conv.mapping ? Object.values(conv.mapping) : [];
    for (const node of messages) {
      if (!node.message || node.message.author?.role !== 'user') continue;
      
      const timestamp = node.message.metadata?.timestamp ?? node.message.create_time;
      if (!timestamp) continue;
      
      const date = new Date(timestamp * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const hour = date.getHours();
      
      dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + 1;
      messagesByHour[hour]++;
      
      if (dailyActivity[dateKey] > busiestDay.count) {
        busiestDay = { date: dateKey, count: dailyActivity[dateKey] };
        maxCount = dailyActivity[dateKey];
      }
      
      if (date < earliestDate) earliestDate = date;
      if (date > latestDate) latestDate = date;
    }
  }
  
  if (Object.keys(dailyActivity).length === 0) {
    return {
      stats: {
        activeDays: 0,
        longestStreak: 0,
        totalDays: 1,
        activityRate: 0,
        hoursWithActivity: 0,
        averageMessagesPerDay: 0,
        busiestDay: null,
        maxCount: 1
      },
      days: [],
      hourlyDistribution: messagesByHour,
      peakHours: []
    };
  }
  
  const days = [];
  const start = new Date(earliestDate);
  const end = new Date(latestDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    const count = dailyActivity[dateKey] || 0;
    maxCount = Math.max(maxCount, count);
    days.push({
      date: new Date(d),
      dateStr: dateKey,
      count,
      dayOfWeek: d.getDay()
    });
  }
  
  let longestStreak = 0;
  let currentStreak = 0;
  let activeDays = 0;
  
  for (const day of days) {
    if (day.count > 0) {
      activeDays++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  
  const totalDays = Math.max(1, days.length);
  const activityRate = Math.round((activeDays / totalDays) * 100);
  
  return {
    stats: {
      activeDays,
      longestStreak,
      totalDays,
      activityRate,
      hoursWithActivity: messagesByHour.filter(h => h > 0).length,
      averageMessagesPerDay: Math.round(Object.values(dailyActivity).reduce((a, b) => a + b, 0) / Math.max(activeDays, 1)),
      busiestDay: busiestDay.date ? { date: busiestDay.date, count: busiestDay.count } : null,
      maxCount: Math.max(maxCount, 1)
    },
    days: days.slice(-365),
    hourlyDistribution: messagesByHour,
    peakHours: messagesByHour
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  };
}

function generateDataInsights(stats, conversations) {
  const topTopic = stats.topics && stats.topics.length > 0 ? stats.topics[0][0] : 'technology';
  const topicCount = stats.topics && stats.topics.length > 0 ? stats.topics[0][1] : 0;
  const totalConvs = stats.totalConversations || 1;
  const totalMsgs = stats.totalMessages || 1;
  const avgMsgsPerConv = Math.round(totalMsgs / totalConvs);
  
  const enhanced = stats.enhanced || {};
  const marathonCount = enhanced.marathonConvos || 0;
  const quickCount = enhanced.quickConvos || 0;
  const nightOwl = enhanced.nightOwlScore || 0;
  
  const generateContextualRoast = () => {
    const roastPool = [];
    
    if (marathonCount > 0) {
      roastPool.push(`You logged ${marathonCount} marathon sessions. That's not a chat, that's a lifestyle.`);
      roastPool.push(`${marathonCount} deep dives? At this point ChatGPT should be on your payroll.`);
    }
    if (quickCount > 0) {
      roastPool.push(`${quickCount} quick chats out of ${totalConvs}. You treat ChatGPT like a search bar with feelings.`);
      roastPool.push(`Your short chats are efficient. Your long chats are... rare.`);
    }
    if (nightOwl > 35) {
      roastPool.push(`${nightOwl}% of your messages land after 10 PM. Sleep is optional, apparently.`);
      roastPool.push(`Night‑owl ratio: ${nightOwl}%. You and ChatGPT are in a committed late‑night relationship.`);
    }
    if (avgMsgsPerConv < 6) {
      roastPool.push(`Average ${avgMsgsPerConv} messages per conversation. Blink and it's over.`);
    }
    if (totalConvs > 300) {
      roastPool.push(`${totalConvs} conversations and you're still "just exploring". Sure.`);
    }
    
    const topicRoasts = {
      coding: `You ask ChatGPT to debug your code more than you run your tests.`,
      writing: `You've rewritten the same sentence with ChatGPT's help at least 47 times.`,
      learning: `Your learning backlog is impressive. Your implementation backlog is larger.`,
      planning: `You plan in ChatGPT. You execute... with reminders from ChatGPT.`,
      creative: `You have amazing ideas, but finishing them? That's the optional DLC.`
    };
    roastPool.push(topicRoasts[topTopic] || `You use ChatGPT for everything, which is great but also... you use it for everything.`);
    
    const index = Math.abs(totalMsgs + totalConvs + marathonCount - quickCount) % roastPool.length;
    return roastPool[index];
  };
  
  const generateContextualCompliment = () => {
    const complimentPool = [];
    
    if (marathonCount > 5) {
      complimentPool.push(`Your long‑form sessions show real depth and persistence.`);
      complimentPool.push(`You stick with problems until they break. That's rare.`);
    }
    if (avgMsgsPerConv >= 10) {
      complimentPool.push(`Average ${avgMsgsPerConv} messages per conversation means you actually explore ideas.`);
    }
    if (nightOwl > 30) {
      complimentPool.push(`Late‑night energy, high‑quality questions. Your focus is strong.`);
    }
    if (totalConvs > 150) {
      complimentPool.push(`You consistently show up and ask better questions. That compounds fast.`);
    }
    
    const topicCompliments = {
      coding: `Your technical depth and problem‑solving approach show real mastery.`,
      writing: `Your attention to detail in language and communication is genuinely impressive.`,
      learning: `Your constant drive to understand and grow is the hallmark of a true learner.`,
      planning: `Your strategic thinking and ability to organize your thoughts is exceptional.`,
      creative: `Your willingness to experiment and explore new ideas is inspiring.`
    };
    complimentPool.push(topicCompliments[topTopic] || `Your conversations show genuine curiosity and thoughtfulness.`);
    
    const index = Math.abs(totalMsgs + totalConvs + quickCount) % complimentPool.length;
    return complimentPool[index];
  };
  
  const topicDescriptions = {
    coding: 'JavaScript, React, and APIs are your favorite tools. You\'re constantly solving technical problems.',
    writing: 'You love crafting emails, articles, and creative content. Communication is your strength.',
    learning: 'You\'re a knowledge seeker. You ask great questions and love understanding how things work.',
    planning: 'You\'re strategically minded. You think ahead and organize your projects well.',
    creative: 'You explore creative and artistic ideas with ChatGPT.'
  };
  
  const spiritAnimals = {
    coding: { animal: 'owl', reason: 'Night owl who debugs at 3 AM' },
    writing: { animal: 'peacock', reason: 'Expressing yourself with flair' },
    learning: { animal: 'dolphin', reason: 'Curious and intelligent explorer' },
    planning: { animal: 'beaver', reason: 'Building structures with intent' },
    creative: { animal: 'phoenix', reason: 'Creating and iterating endlessly' }
  };
  
  const personalities = {
    coding: { title: 'The Architect', subtitle: 'Building logic, one function at a time' },
    writing: { title: 'The Wordsmith', subtitle: 'Crafting the perfect phrase' },
    learning: { title: 'The Scholar', subtitle: 'Perpetually curious and questioning' },
    planning: { title: 'The Strategist', subtitle: 'Always thinking three steps ahead' },
    creative: { title: 'The Creator', subtitle: 'Bringing ideas to life' }
  };
  
  const roastText = generateContextualRoast();
  const complimentText = generateContextualCompliment();
  
  return {
    topObsession: {
      topic: topTopic,
      count: topicCount,
      roast: roastText
    },
    oneLineRoast: roastText,
    compliment: complimentText,
    personality: personalities[topTopic] || { title: 'The Seeker', subtitle: 'Multi-disciplinary explorer' },
    spiritAnimal: spiritAnimals[topTopic] || { animal: 'owl', reason: 'Wise and observant' },
    profileSummary: `Based on ${stats.totalConversations} conversations and ${stats.totalMessages} messages, you're deeply engaged with ChatGPT.`,
    obsession: topTopic,
    obsessionDetail: topicDescriptions[topTopic] || 'You\'re a multi-disciplinary explorer.',
    hiddenTheme: 'You\'re driven by curiosity and the desire to understand and create.',
    questionStyle: 'You ask thoughtful, specific questions that show genuine engagement.',
    roastPoint: roastText,
    complimentPoint: complimentText,
    trendInsight: `Your ${stats.totalConversations} conversations show you\'re actively using ChatGPT as a thinking tool.`,
    achievements: ['Conversation Explorer', 'Curious Mind', 'AI Companion User']
  };
}
