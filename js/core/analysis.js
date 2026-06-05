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
  // Theme patterns — tightened to avoid overly broad single-word matches.
  // Each pattern requires multi-word context or domain-specific terms.
  const themePatterns = [
    { name: 'Learning & Education', pattern: /learn(?:ing|ed|s)?|tutorial|explain(?:ed|ing)?|understand(?:ing)?|teach(?:ing|er)?|course|study(?:ing)?|how (?:does|do|to|can|is|are|would|should|could|did)|lesson|curriculum|textbook|homework|lecture/i },
    { name: 'Creative Writing', pattern: /(?:creative )?writ(?:e|ing|ten)|article|blog ?post|(?:short )?story|narrative|screenplay|script(?:writing)?|poem|poetry|fiction|novel|essay(?:s)?|copywriting|prose/i },
    { name: 'Technical Architecture', pattern: /architect(?:ure|ural)?|system design|design pattern|microservice|scalab(?:le|ility)|infra(?:structure)?|monolith(?:ic)?|load balanc|distributed system|api design|event.driven/i },
    { name: 'Business & Entrepreneurship', pattern: /business (?:plan|model|strategy)|startup|entrepreneur(?:ship)?|monetiz(?:e|ation)|revenue|profit(?:ability)?|investor|pitch deck|saas|b2b|b2c|go.to.market|market fit|fundrais/i },
    { name: 'AI Image Generation', pattern: /dall[\-\s]?e|midjourney|stable diffusion|generate (?:an? )?image|image generat(?:ion|ed|or)|ai art|text[\-\s]to[\-\s]image|create (?:an? )?(?:image|picture|illustration|artwork)|make (?:an? )?(?:image|picture|illustration)|image prompt/i },
    { name: 'Career & Growth', pattern: /career (?:advice|path|change|growth)|job (?:interview|search|application|hunting|offer)|resume|cover letter|\bcv\b|hiring|promot(?:ed|ion)|salary|linkedin|recruiter|interview prep/i },
    { name: 'Productivity & Organization', pattern: /productiv(?:ity|e)|(?:get(?:ting)? )?organiz(?:ed|ation|ing)|time manag(?:ement|ing)|pomodoro|notion|obsidian|workflow|habit track|daily routine|prioritiz/i },
    { name: 'Personal Life', pattern: /relationship (?:advice|issue|problem)|dating|family (?:issue|problem|advice)|self[\-\s]?care|mental health|therap(?:y|ist)|life advice|personal (?:growth|development|issue|problem)|well[\-\s]?being|mindful(?:ness)?/i },
    { name: 'Coding & Development', pattern: /\b(?:code|coding|function|bug|error|debug|refactor|compile|syntax|variable|loop|array|class|object|method|api|endpoint|http|rest|graphql|typescript|javascript|python|react|node|vue|angular|docker|kubernetes|git|deploy|webpack|npm|pip)\b/i },
    { name: 'Data & Analytics', pattern: /data (?:analy(?:sis|tics)|engineer|pipeline|warehouse|lake)|machine learning|deep learning|neural net|pandas|numpy|sql quer|(?:data )?visualiz|statistic(?:s|al)|regression|classif(?:y|ication|ier)|dataset/i },
    { name: 'Marketing & Content', pattern: /marketing (?:strategy|plan|campaign)|seo|social media (?:strategy|marketing|post)|content (?:strategy|marketing|calendar)|email (?:marketing|campaign)|brand(?:ing)?|audience|engagement|conversion/i },
    { name: 'Finance & Investing', pattern: /invest(?:ing|ment|or)|stock(?:s| market)|crypto(?:currency)?|bitcoin|ethereum|portfolio|financial (?:plan|advice|model)|budget(?:ing)?|tax(?:es)?|accounting|compound interest|dividend/i },
  ];

  // Per-message counting: each user message is assigned to at most one theme
  const themeCounts = {};

  for (const conv of conversations) {
    const nodes = conv.mapping ? Object.values(conv.mapping) : [];

    for (const node of nodes) {
      if (!node.message) continue;
      // Only count user messages
      if (node.message.author?.role !== 'user') continue;

      const parts = node.message.content?.parts;
      if (!parts) continue;
      const text = parts.filter(p => typeof p === 'string').join(' ');
      if (text.length < 10) continue;

      // Also include the conversation title for context
      const fullText = ((conv.title || '') + ' ' + text);

      // Score each theme and pick the best match (single assignment)
      let bestTheme = null;
      let bestScore = 0;

      for (const { name, pattern } of themePatterns) {
        const matches = fullText.match(new RegExp(pattern.source, 'gi'));
        const score = matches ? matches.length : 0;
        if (score > bestScore) {
          bestScore = score;
          bestTheme = name;
        }
      }

      if (bestTheme) {
        themeCounts[bestTheme] = (themeCounts[bestTheme] || 0) + 1;
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

// ============================================
// BEHAVIORAL PERSONALITY ENGINE (Bug 4 fix)
// ============================================
// Replaces hardcoded topic→personality lookup with multi-dimensional
// behavioral analysis. Personality is determined by actual usage patterns
// (depth, breadth, intensity, nocturnality, consistency), not topic category.

function generatePersonality(stats) {
  const enhanced = stats.enhanced || {};
  const nightOwl = enhanced.nightOwlScore || 0;
  const marathon = enhanced.marathonConvos || 0;
  const totalConvos = stats.totalConversations || 1;
  const topicCount = stats.topics?.length || 0;
  const avgMsgsPerConv = Math.round((stats.totalMessages || 0) / totalConvos);
  const totalActiveDays = enhanced.totalActiveDays || 0;
  const longestStreak = enhanced.longestStreak || 0;

  // Calculate behavioral dimensions (0-100 each)
  const depthScore = Math.min(100, Math.round((marathon / totalConvos) * 500));
  const breadthScore = Math.min(100, topicCount * 20);
  const intensityScore = Math.min(100, avgMsgsPerConv * 5);
  const nocturnalScore = nightOwl;
  const consistencyScore = totalActiveDays
    ? Math.min(100, Math.round((totalActiveDays / 365) * 100))
    : (longestStreak > 0 ? Math.min(100, longestStreak * 5) : 0);

  // Sort traits to find primary and secondary behavioral dimensions
  const traits = [
    { trait: 'depth', score: depthScore },
    { trait: 'breadth', score: breadthScore },
    { trait: 'intensity', score: intensityScore },
    { trait: 'nocturnal', score: nocturnalScore },
    { trait: 'consistency', score: consistencyScore },
  ].sort((a, b) => b.score - a.score);

  const primary = traits[0].trait;
  const secondary = traits[1].trait;

  // Personality matrix — 20 unique combinations of primary+secondary traits
  // Each entry is data-driven: title, subtitle, spirit animal, and reason reference real numbers
  const matrix = {
    'depth+nocturnal':       { title: 'The Midnight Philosopher', subtitle: 'Deep thoughts after dark', animal: 'owl', reason: `${marathon} deep dives, ${nightOwl}% after midnight` },
    'depth+intensity':       { title: 'The Deep Diver', subtitle: 'You don\'t skim — you excavate', animal: 'whale', reason: `${avgMsgsPerConv} msgs/conversation avg — you go DEEP` },
    'depth+breadth':         { title: 'The Renaissance Mind', subtitle: 'Deep knowledge, wide horizons', animal: 'octopus', reason: `Deep dives across ${topicCount} topics — tentacles everywhere` },
    'depth+consistency':     { title: 'The Devoted Scholar', subtitle: 'Shows up, digs deep, repeats', animal: 'bear', reason: `${totalActiveDays} days of consistent deep exploration` },
    'breadth+nocturnal':     { title: 'The Night Explorer', subtitle: 'Curiosity doesn\'t sleep', animal: 'bat', reason: `${topicCount} topics explored, mostly after dark` },
    'breadth+intensity':     { title: 'The Polymath', subtitle: 'High energy across every domain', animal: 'crow', reason: `Intensely curious across ${topicCount} different domains` },
    'breadth+depth':         { title: 'The Renaissance Mind', subtitle: 'Master of many, dilettante of none', animal: 'octopus', reason: `${topicCount} topics with real depth — ${marathon} marathons` },
    'breadth+consistency':   { title: 'The Steady Explorer', subtitle: 'Slow, steady, everywhere', animal: 'turtle', reason: `${totalActiveDays} active days across ${topicCount} topics` },
    'intensity+nocturnal':   { title: 'The Night Warrior', subtitle: 'Peak output after dark', animal: 'wolf', reason: `${avgMsgsPerConv} msg avg, ${nightOwl}% after 10pm — relentless` },
    'intensity+depth':       { title: 'The Obsessive Builder', subtitle: 'Won\'t stop until it\'s done', animal: 'beaver', reason: `${avgMsgsPerConv} msg avg across ${marathon} marathon sessions` },
    'intensity+breadth':     { title: 'The Speed Learner', subtitle: 'Fast, furious, and curious', animal: 'eagle', reason: `High intensity across ${topicCount} topics` },
    'intensity+consistency': { title: 'The Machine', subtitle: 'Relentless daily output', animal: 'ant', reason: `${avgMsgsPerConv} msgs/conv, ${totalActiveDays} active days — no breaks` },
    'nocturnal+depth':       { title: 'The Midnight Philosopher', subtitle: 'Best ideas come at 2 AM', animal: 'owl', reason: `${nightOwl}% night sessions, mostly deep dives` },
    'nocturnal+breadth':     { title: 'The Insomniac Explorer', subtitle: 'Too curious to sleep', animal: 'raccoon', reason: `Late-night curiosity across ${topicCount} topics` },
    'nocturnal+intensity':   { title: 'The Dark Mode Power User', subtitle: 'After hours, full throttle', animal: 'panther', reason: `Peak intensity after dark — ${nightOwl}% nocturnal` },
    'nocturnal+consistency': { title: 'The Night Shift Regular', subtitle: 'Reliably nocturnal', animal: 'cat', reason: `${nightOwl}% after 10pm, ${longestStreak}-day streak` },
    'consistency+depth':     { title: 'The Disciplined Thinker', subtitle: 'Shows up for serious thinking', animal: 'elephant', reason: `${totalActiveDays} days of deep work, ${marathon} marathons` },
    'consistency+breadth':   { title: 'The Everyday Learner', subtitle: 'Daily exploration, no limits', animal: 'dolphin', reason: `${totalActiveDays} active days across ${topicCount} topics` },
    'consistency+intensity': { title: 'The Workhorse', subtitle: 'High output, every single day', animal: 'horse', reason: `${avgMsgsPerConv} msgs/conv avg, ${totalActiveDays} active days` },
    'consistency+nocturnal': { title: 'The Late Night Regular', subtitle: 'Consistently up late, always productive', animal: 'cat', reason: `${nightOwl}% nocturnal, ${totalActiveDays} active days` },
  };

  const key = `${primary}+${secondary}`;
  const match = matrix[key] || {
    title: 'The Explorer',
    subtitle: 'Charting your own path',
    animal: 'fox',
    reason: `A unique blend of ${primary} and ${secondary}`
  };

  return {
    personality: { title: match.title, subtitle: match.subtitle },
    spiritAnimal: { animal: match.animal, reason: match.reason },
    traits: { primary, secondary, depthScore, breadthScore, intensityScore, nocturnalScore, consistencyScore }
  };
}

// ============================================
// CLIENT-SIDE FUN FACTS (unique insights for Cosmic Revelations)
// ============================================
// Generates facts that do NOT duplicate other slides (streaks, peak hour, etc.)

function generateClientFunFacts(stats, conversations, enhanced) {
  const facts = [];
  const totalConvs = stats.totalConversations || 1;
  const totalMsgs = stats.totalMessages || 1;

  // Quick scan of user messages for behavioral stats
  let questionMessages = 0;
  let totalUserMsgs = 0;
  let totalUserChars = 0;
  let oneShots = 0;
  let longestTitleLen = 0;
  let longestTitle = '';

  for (const conv of conversations) {
    const msgs = conv.mapping ? Object.values(conv.mapping) : [];
    let userMsgCount = 0;
    for (const node of msgs) {
      if (node.message?.author?.role === 'user') {
        const text = node.message.content?.parts?.join(' ') || '';
        totalUserMsgs++;
        totalUserChars += text.length;
        userMsgCount++;
        if (text.includes('?')) questionMessages++;
      }
    }
    if (userMsgCount === 1) oneShots++;

    const title = conv.title || '';
    if (title.length > longestTitleLen) {
      longestTitleLen = title.length;
      longestTitle = title;
    }
  }

  // 1. Question vs statement ratio
  if (totalUserMsgs > 0) {
    const questionRatio = Math.round((questionMessages / totalUserMsgs) * 100);
    const label = questionRatio > 60 ? 'question machine' : questionRatio > 30 ? 'curious thinker' : 'statement maker';
    facts.push(`<span class="fact-number">${questionRatio}%</span> of your messages are questions — you're a ${label}`);
  }

  // 2. Average message length personality
  if (totalUserMsgs > 0) {
    const avgLen = Math.round(totalUserChars / totalUserMsgs);
    const label = avgLen > 500 ? 'essay writer' : avgLen > 200 ? 'detailed explainer' : avgLen > 50 ? 'concise communicator' : 'rapid-fire typist';
    facts.push(`Average message: <span class="fact-number">${avgLen}</span> characters — you're a ${label}`);
  }

  // 3. One-shot conversation ratio
  if (oneShots > 0) {
    const oneShotRatio = Math.round((oneShots / totalConvs) * 100);
    if (oneShotRatio > 15) {
      facts.push(`<span class="fact-number">${oneShotRatio}%</span> of your conversations were one-and-done — you know exactly what you need`);
    }
  }

  // 4. Longest conversation title
  if (longestTitleLen > 50) {
    facts.push(`Your longest conversation title was <span class="fact-number">${longestTitleLen}</span> characters: "${longestTitle.slice(0, 35)}..."`);
  }

  // 5. Conversation title style (what % are questions)
  let questionTitles = 0;
  let titledConvs = 0;
  for (const conv of conversations) {
    const title = (conv.title || '').trim();
    if (title && title.toLowerCase() !== 'new chat' && title.toLowerCase() !== 'untitled') {
      titledConvs++;
      if (title.endsWith('?') || /^(how|what|why|where|when|who|which|can|could|should|would|is|are|do|does|did)\b/i.test(title)) {
        questionTitles++;
      }
    }
  }
  if (titledConvs > 10) {
    const qTitleRatio = Math.round((questionTitles / titledConvs) * 100);
    const label = qTitleRatio > 50 ? 'you come to ChatGPT with questions first' : qTitleRatio > 20 ? 'a mix of questions and commands' : 'you give orders, not questions';
    facts.push(`<span class="fact-number">${qTitleRatio}%</span> of your conversation titles are questions — ${label}`);
  }

  // 6. Code block density
  if (stats.codeBlocks > 10) {
    const codeRatio = Math.round((stats.codeBlocks / (stats.userMessages || 1)) * 100);
    facts.push(`<span class="fact-number">${stats.codeBlocks}</span> code blocks shared — ${codeRatio}% of your messages include code`);
  }

  // 7. Weekend vs weekday personality
  const weekendRatio = enhanced.weekendRatio || 0;
  if (weekendRatio > 55) {
    facts.push(`<span class="fact-number">${weekendRatio}%</span> weekend usage — ChatGPT is your weekend hobby partner`);
  } else if (weekendRatio < 15 && weekendRatio > 0) {
    facts.push(`Only <span class="fact-number">${weekendRatio}%</span> weekend usage — you clock out from AI on weekends like a pro`);
  }

  // 8. Marathon-to-quick ratio
  const marathonCount = enhanced.marathonConvos || 0;
  const quickCount = enhanced.quickConvos || 0;
  if (marathonCount > 0 && quickCount > 0) {
    const ratio = Math.round(quickCount / marathonCount);
    if (ratio > 5) {
      facts.push(`For every marathon session, you fire off <span class="fact-number">${ratio}</span> quick chats — efficiency meets depth`);
    }
  }

  return facts.slice(0, 6);
}

// Generate dynamic achievement labels from real data
function generateAchievementLabels(stats, enhanced) {
  const labels = [];
  if ((stats.totalConversations || 0) > 100) labels.push('Conversation Power User');
  if ((enhanced.marathonConvos || 0) > 5) labels.push('Marathon Runner');
  if ((enhanced.nightOwlScore || 0) > 30) labels.push('Night Owl');
  if ((stats.topics?.length || 0) >= 4) labels.push('Topic Explorer');
  if ((enhanced.longestStreak || 0) > 7) labels.push('Streak Champion');
  if (labels.length === 0) labels.push('AI Explorer');
  return labels;
}

// ============================================
// MAIN INSIGHTS GENERATOR
// ============================================

function generateDataInsights(stats, conversations) {
  // Determine top topic with "general"/"other" safeguard (Bug 6)
  let topTopic = stats.topics && stats.topics.length > 0 ? stats.topics[0][0] : 'technology';
  let topicCount = stats.topics && stats.topics.length > 0 ? stats.topics[0][1] : 0;
  if ((topTopic === 'general' || topTopic === 'other') && stats.topics && stats.topics.length > 1) {
    topTopic = stats.topics[1][0];
    topicCount = stats.topics[1][1];
  }

  const totalConvs = stats.totalConversations || 1;
  const totalMsgs = stats.totalMessages || 1;
  const avgMsgsPerConv = Math.round(totalMsgs / totalConvs);

  const enhanced = stats.enhanced || {};
  const marathonCount = enhanced.marathonConvos || 0;
  const quickCount = enhanced.quickConvos || 0;
  const nightOwl = enhanced.nightOwlScore || 0;
  const totalActiveDays = enhanced.totalActiveDays || 0;
  const longestStreak = enhanced.longestStreak || 0;
  const weekendRatio = enhanced.weekendRatio || 0;
  const topicDiversity = stats.topics?.length || 0;
  const trendDirection = enhanced.trendDirection || 0;

  // Generate behavioral personality (Bug 4 fix — replaces hardcoded lookup)
  const { personality, spiritAnimal } = generatePersonality(stats);

  // ----- Contextual Roasts (expanded to 30+ topic categories) -----
  const generateContextualRoast = () => {
    const roastPool = [];

    // Behavioral roasts (from real data patterns)
    if (marathonCount > 0) {
      roastPool.push(`You logged ${marathonCount} marathon sessions. That's not a chat, that's a lifestyle.`);
      roastPool.push(`${marathonCount} deep dives? At this point ChatGPT should be on your payroll.`);
    }
    if (quickCount > totalConvs * 0.5) {
      roastPool.push(`${quickCount} quick chats out of ${totalConvs}. You treat ChatGPT like a search bar with feelings.`);
    }
    if (nightOwl > 35) {
      roastPool.push(`${nightOwl}% of your messages land after 10 PM. Sleep is optional, apparently.`);
      roastPool.push(`Night-owl ratio: ${nightOwl}%. You and ChatGPT are in a committed late-night relationship.`);
    }
    if (avgMsgsPerConv < 6) {
      roastPool.push(`Average ${avgMsgsPerConv} messages per conversation. Blink and it's over.`);
    }
    if (avgMsgsPerConv > 30) {
      roastPool.push(`Average ${avgMsgsPerConv} messages per conversation. You don't need AI, you need a diary.`);
    }
    if (totalConvs > 500) {
      roastPool.push(`${totalConvs.toLocaleString()} conversations. At this point ChatGPT should charge rent.`);
    } else if (totalConvs > 300) {
      roastPool.push(`${totalConvs} conversations and you're still "just exploring". Sure.`);
    }
    if (weekendRatio > 60) {
      roastPool.push(`${weekendRatio}% weekend usage. ChatGPT is literally your weekend plans.`);
    }
    if (longestStreak > 30) {
      roastPool.push(`A ${longestStreak}-day streak. That's not dedication, that's dependency.`);
    }

    // Topic-specific roasts (expanded from 5 to 30+ categories)
    const topicRoasts = {
      'coding': `You ask ChatGPT to debug your code more than you run your tests.`,
      'web-dev': `You've asked "is this a CSS or a JavaScript problem?" more times than you'd admit.`,
      'mobile-dev': `Your app has been "almost ready for the App Store" for ${Math.max(1, Math.round(topicCount / 100))} months now.`,
      'data-analytics': `You've analyzed everything except why you're still analyzing at 2 AM.`,
      'ai-ml': `You're training AI to replace... yourself? Bold strategy.`,
      'devops': `Your CI/CD pipeline has more stages than your personal growth plan.`,
      'cloud': `Your AWS bill is the real cloud — hanging over your head.`,
      'security': `You know 47 ways to hack a system but still reuse passwords.`,
      'database': `You've written more SQL queries for ChatGPT than for production.`,
      'testing-qa': `You write tests for everything except your life choices.`,
      'architecture': `Your system diagram has more boxes than your apartment.`,
      'ux-ui': `You've debated border-radius values more than life decisions.`,
      'product': `Your roadmap exists in ${Math.max(1, topicDiversity)} ChatGPT conversations and zero documents.`,
      'business': `Your business plan lives in ChatGPT threads. Investors would love that.`,
      'marketing': `You've A/B tested your ChatGPT prompts more than your actual campaigns.`,
      'sales': `Your sales scripts are AI-generated. Your prospects can probably tell.`,
      'customer-support': `You practice empathy with an AI before dealing with real customers.`,
      'finance': `You've asked ChatGPT for financial advice more times than your actual advisor.`,
      'crypto': `You asked an AI for crypto advice. The AI that hallucinates. Bold.`,
      'legal': `You're getting legal advice from an AI that confidently makes things up. What could go wrong?`,
      'hr-people': `You practice difficult conversations with an AI. Your team appreciates the rehearsal.`,
      'writing': `You've rewritten the same sentence with ChatGPT's help at least 47 times.`,
      'creative': `You have amazing ideas, but finishing them? That's the optional DLC.`,
      'learning': `Your learning backlog is impressive. Your implementation backlog is larger.`,
      'planning': `You plan in ChatGPT. You execute... with reminders from ChatGPT.`,
      'education': `You've turned ChatGPT into your personal tutor. Your actual teachers are jealous.`,
      'health-fitness': `ChatGPT is not a doctor, but you've treated it like one ${topicCount} times.`,
      'mental-health': `Using AI for mental health support is valid. Using it at 3 AM, ${nightOwl}% of the time? Concerning.`,
      'relationships': `You rehearse conversations with an AI before having them with humans.`,
      'productivity': `The irony of spending ${totalConvs} conversations optimizing productivity...`,
      'gaming': `Your game design docs in ChatGPT outnumber your shipped games by roughly... all of them.`,
      'design': `You've iterated on color palettes with ChatGPT more than any human designer would tolerate.`,
      'music-audio': `Your beats are generated, your lyrics are prompted, your talent is... delegated.`,
      'travel': `You've planned more trips in ChatGPT than you've actually taken.`,
      'food-cooking': `You ask ChatGPT for recipes like it has taste buds.`,
      'performance': `You've optimized everything except your sleep schedule.`,
      'math': `You ask ChatGPT for math help and then double-check it with a calculator anyway.`,
      'science': `Your hypothesis: ChatGPT can solve anything. Your data: ${totalConvs} experiments and counting.`,
      'philosophy': `You debate existence with an AI. The AI doesn't exist. The irony writes itself.`,
      'language-learning': `You're learning a language from an AI that technically speaks all of them. Shortcut or genius?`,
    };

    const topicRoast = topicRoasts[topTopic];
    if (topicRoast) {
      roastPool.push(topicRoast);
    } else {
      roastPool.push(`Your #1 topic is "${topTopic}" with ${topicCount} conversations. That's not interest, that's an identity.`);
    }

    if (roastPool.length === 0) {
      roastPool.push(`${totalConvs} conversations with an AI. We're not judging. (We are.)`);
    }

    const index = Math.abs(totalMsgs + totalConvs + marathonCount - quickCount) % roastPool.length;
    return roastPool[index];
  };

  // ----- Contextual Compliments (expanded) -----
  const generateContextualCompliment = () => {
    const complimentPool = [];

    if (marathonCount > 5) {
      complimentPool.push(`${marathonCount} marathon sessions show real depth and persistence. You stick with problems until they break.`);
    }
    if (avgMsgsPerConv >= 10) {
      complimentPool.push(`Average ${avgMsgsPerConv} messages per conversation — you actually explore ideas instead of surface-skimming.`);
    }
    if (nightOwl > 30) {
      complimentPool.push(`Late-night energy with high-quality questions. Your ${nightOwl}% night-owl focus is genuinely impressive.`);
    }
    if (totalConvs > 300) {
      complimentPool.push(`${totalConvs.toLocaleString()} conversations — you consistently show up and ask better questions. That compounds fast.`);
    }
    if (longestStreak > 14) {
      complimentPool.push(`A ${longestStreak}-day streak shows you've built AI into your daily workflow. That's genuine commitment.`);
    }
    if (totalActiveDays > 200) {
      complimentPool.push(`${totalActiveDays} active days — you're not a tourist, you're a resident. That consistency is rare.`);
    }
    if (topicDiversity >= 4) {
      complimentPool.push(`Exploring ${topicDiversity} different topics shows intellectual range. You're not boxed in.`);
    }

    const topicCompliments = {
      'coding': `Your technical depth and iterative problem-solving show real mastery developing.`,
      'web-dev': `You build for the web with care and attention to detail. Users notice that.`,
      'mobile-dev': `Shipping apps is hard. Your persistence through mobile dev challenges is admirable.`,
      'data-analytics': `Your data-driven approach means you make decisions others only guess at.`,
      'ai-ml': `Being hands-on with AI puts you years ahead. You're building the future, not just reading about it.`,
      'devops': `You make the invisible infrastructure work. That's the most thankless and crucial role.`,
      'writing': `Your attention to language and communication is genuinely impressive.`,
      'creative': `Your willingness to experiment and explore new ideas is inspiring.`,
      'learning': `Your constant drive to understand and grow is the hallmark of a true learner.`,
      'planning': `Your strategic thinking and ability to organize complex projects is exceptional.`,
      'business': `Thinking through business problems thoroughly before acting — that's founder-level discipline.`,
      'product': `Your product thinking is sharp. The best PMs think in ChatGPT threads too.`,
      'design': `Your design sensibility and iteration process show a real eye for quality.`,
      'finance': `Financial literacy this deep is rare. Your future self will thank you.`,
      'health-fitness': `Investing in health knowledge is investing in everything else. Smart priority.`,
      'education': `Using AI to learn makes you a force multiplier. Your students and colleagues benefit too.`,
      'security': `The world needs more security-minded people. Your vigilance matters.`,
      'productivity': `Optimizing how you work means everything else gets better. Meta-productivity is real.`,
      'database': `You understand the foundation everything else is built on. That's structural thinking.`,
      'architecture': `You think in systems, not features. That's the most valuable engineering skill.`,
      'marketing': `You understand what makes people tick. That's a superpower in any field.`,
      'mental-health': `Investing in your mental wellbeing shows real self-awareness. Keep going.`,
    };

    const topicCompliment = topicCompliments[topTopic];
    if (topicCompliment) {
      complimentPool.push(topicCompliment);
    } else {
      complimentPool.push(`Your dedication to "${topTopic}" across ${topicCount} conversations shows genuine depth.`);
    }

    if (complimentPool.length === 0) {
      complimentPool.push(`${totalConvs.toLocaleString()} conversations and ${totalMsgs.toLocaleString()} messages — you're building a real AI workflow.`);
    }

    const index = Math.abs(totalMsgs + totalConvs + quickCount) % complimentPool.length;
    return complimentPool[index];
  };

  const roastText = generateContextualRoast();
  const complimentText = generateContextualCompliment();

  // ----- Data-driven obsession detail -----
  const percentage = Math.round((topicCount / totalConvs) * 100);
  const obsessionDetail = `${topicCount} conversations (${percentage}% of all chats) about ${topTopic}. ${
    percentage > 25 ? 'This is a deep obsession.' :
    percentage > 15 ? 'A clear priority in your AI conversations.' :
    'One of your key interests.'
  }`;

  // ----- Data-driven hidden theme -----
  let hiddenTheme;
  if (marathonCount > quickCount * 0.5 && marathonCount > 3) {
    hiddenTheme = `You favor depth over breadth — ${marathonCount} marathon sessions vs ${quickCount} quick hits.`;
  } else if (topicDiversity >= 4) {
    hiddenTheme = `You're a generalist at heart, spreading across ${topicDiversity} topics with curiosity.`;
  } else if (nightOwl > 30) {
    hiddenTheme = `Your best thinking happens after dark — ${nightOwl}% of messages sent after 10 PM.`;
  } else {
    hiddenTheme = `Your ${totalConvs.toLocaleString()} conversations reveal a pattern of consistent, deliberate exploration.`;
  }

  // ----- Data-driven question style -----
  let questionStyle;
  if (avgMsgsPerConv > 20) {
    questionStyle = `Iterative deep-diver — you average ${avgMsgsPerConv} messages per conversation, refining as you go.`;
  } else if (avgMsgsPerConv > 8) {
    questionStyle = `Thorough but focused — ${avgMsgsPerConv} messages per conversation shows you explore without meandering.`;
  } else if (avgMsgsPerConv > 3) {
    questionStyle = `Efficient questioner — you get what you need in ~${avgMsgsPerConv} exchanges, then move on.`;
  } else {
    questionStyle = `Rapid-fire — quick, targeted questions at ${avgMsgsPerConv} messages per conversation.`;
  }

  // ----- Data-driven trend insight -----
  let trendInsight;
  if (trendDirection > 30) {
    trendInsight = `Your usage surged ${trendDirection}% in the last 6 months — you're accelerating.`;
  } else if (trendDirection < -30) {
    trendInsight = `Your usage dipped ${Math.abs(trendDirection)}% recently — taking a breather or found your groove?`;
  } else if (totalActiveDays > 0) {
    trendInsight = `Steady usage across ${totalActiveDays} active days — you've built AI into your rhythm.`;
  } else {
    trendInsight = `Your ${totalConvs.toLocaleString()} conversations show you're actively using ChatGPT as a thinking tool.`;
  }

  // ----- Fun facts for client-side Cosmic Revelations -----
  const funFacts = generateClientFunFacts(stats, conversations, enhanced);

  return {
    topObsession: {
      topic: topTopic,
      count: topicCount,
      roast: roastText
    },
    oneLineRoast: roastText,
    compliment: complimentText,
    personality,
    spiritAnimal,
    profileSummary: `Based on ${totalConvs.toLocaleString()} conversations and ${totalMsgs.toLocaleString()} messages across ${totalActiveDays || 'many'} active days.`,
    obsession: topTopic,
    obsessionDetail,
    hiddenTheme,
    questionStyle,
    roastPoint: roastText,
    complimentPoint: complimentText,
    trendInsight,
    achievements: generateAchievementLabels(stats, enhanced),
    funFacts,
  };
}
