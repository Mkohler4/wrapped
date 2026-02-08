// ============================================
// ChatGPT Wrapped - Image Extraction (Client-Side)
// ============================================

/**
 * Generate a gradient color pair from an index for placeholder cards.
 */
function generateGradientFromIndex(index) {
  const palettes = [
    ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#a18cd1', '#fbc2eb'],
    ['#fccb90', '#d57eeb'], ['#e0c3fc', '#8ec5fc'], ['#f5576c', '#ff6a88'],
    ['#667eea', '#00c6fb'], ['#48c6ef', '#6f86d6'], ['#feada6', '#f5efef'],
    ['#a1c4fd', '#c2e9fb'], ['#d4fc79', '#96e6a1'], ['#84fab0', '#8fd3f4'],
  ];
  return palettes[index % palettes.length];
}

/**
 * Walk up the conversation tree to find the user message that triggered an image.
 */
function findParentUserMessage(mapping, node) {
  if (!mapping || !node) return null;
  let current = node;
  const visited = new Set();
  while (current) {
    if (visited.has(current.id)) break;
    visited.add(current.id);
    if (current.message?.author?.role === 'user') {
      const parts = current.message.content?.parts;
      if (parts) {
        const textParts = parts.filter(p => typeof p === 'string').join(' ').trim();
        if (textParts) return textParts;
      }
    }
    const parentId = current.parent;
    if (!parentId || !mapping[parentId]) break;
    current = mapping[parentId];
  }
  return null;
}

// Track whether we've logged the first resolve attempt (for debugging)
let _resolveDebugLogged = false;

/**
 * Resolve an asset_pointer to a blob URL from the ZIP image map.
 * Handles both old format (file-service://file-XXXXX) and new format (sediment://file_XXXXX).
 */
function resolveImageFromZip(assetPointer, zipImageMap) {
  if (!assetPointer || !zipImageMap || Object.keys(zipImageMap).length === 0) return null;

  if (!_resolveDebugLogged) {
    _resolveDebugLogged = true;
    const sampleKeys = Object.keys(zipImageMap).filter(k => k.startsWith('file') || k.startsWith('sediment')).slice(0, 6);
    console.log('🔍 Image resolve debug — asset_pointer:', assetPointer);
    console.log('   ZIP map sample keys:', sampleKeys);
  }

  // 1. Direct match (includes protocol-prefixed keys like file-service://... and sediment://...)
  if (zipImageMap[assetPointer]) return zipImageMap[assetPointer];

  // 2. Strip protocol prefix and try bare ID
  const stripped = assetPointer.replace(/^(file-service|sediment):\/\//, '');
  if (zipImageMap[stripped]) return zipImageMap[stripped];

  // 3. Fuzzy match: check if any key contains the stripped ID or vice versa
  for (const key of Object.keys(zipImageMap)) {
    if (key.includes(stripped) || stripped.includes(key.replace(/\.[^.]+$/, ''))) {
      return zipImageMap[key];
    }
  }

  return null;
}

/**
 * Extract image prompts and stats from conversations for the gallery slide.
 */
function extractImagePrompts(conversations, zipImageMap) {
  const prompts = [];
  let generated = 0;
  let idCounter = 0;
  const imgMap = zipImageMap || {};
  const seen = new Set();
  const processedNodeIds = new Set(); // Track nodes already handled by multimodal/direct paths

  for (const convo of conversations) {
    const mapping = convo.mapping || {};
    const messages = Object.values(mapping);

    for (const node of messages) {
      if (!node.message) continue;
      const msg = node.message;
      const convoTitle = convo.title || 'Untitled';
      const role = msg.author?.role || '';

      // --- Multimodal text with image_asset_pointer parts (generated only) ---
      if (msg.content?.content_type === 'multimodal_text' && msg.content.parts) {
        // Skip user-uploaded images entirely
        if (role === 'user') continue;

        for (const part of msg.content.parts) {
          if (typeof part === 'object' && part.content_type === 'image_asset_pointer') {
            const assetPointer = part.asset_pointer || '';
            const dedupeKey = assetPointer || `${convoTitle}::${node.id || ''}::${idCounter}`;

            if (!seen.has(dedupeKey)) {
              seen.add(dedupeKey);
              processedNodeIds.add(node.id);

              // Prompt can be in multiple places:
              // 1. Part metadata: part.metadata.dalle.prompt (old format)
              // 2. Message metadata: msg.metadata.dalle.prompt (old format)
              // 3. Message metadata: msg.metadata.image_gen_title (new format)
              // 4. Parent user message text (fallback)
              const partDallePrompt = part.metadata?.dalle?.prompt || '';
              const msgDallePrompt = msg.metadata?.dalle?.prompt || '';
              const imageGenTitle = msg.metadata?.image_gen_title || '';
              const dallePrompt = partDallePrompt || msgDallePrompt || imageGenTitle;
              const prompt = dallePrompt || findParentUserMessage(mapping, node) || 'AI Generated Image';

              generated++;

              const blobUrl = resolveImageFromZip(assetPointer, imgMap);
              prompts.push({
                id: `img-${idCounter++}`,
                source: 'generated',
                prompt: prompt,
                conversationTitle: convoTitle,
                imagePath: blobUrl,
                hasRealImage: !!blobUrl,
                imageType: 'Generated',
                gradientColors: generateGradientFromIndex(idCounter),
                index: idCounter,
              });
            }
          }
        }
      }

      // --- Direct image_asset_pointer at top level (rare, generated only) ---
      if (msg.content?.content_type === 'image_asset_pointer') {
        // Skip user-uploaded images
        if (role === 'user') continue;

        const assetPointer = msg.content.asset_pointer || '';
        const dedupeKey = assetPointer || `${convoTitle}::direct::${node.id || ''}`;

        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          processedNodeIds.add(node.id);
          const imageGenTitle = msg.metadata?.image_gen_title || '';
          const userPrompt = findParentUserMessage(mapping, node);
          const prompt = imageGenTitle || userPrompt || 'AI Generated Image';

          generated++;

          const blobUrl = resolveImageFromZip(assetPointer, imgMap);
          prompts.push({
            id: `img-${idCounter++}`,
            source: 'generated',
            prompt: prompt,
            conversationTitle: convoTitle,
            imagePath: blobUrl,
            hasRealImage: !!blobUrl,
            imageType: 'Generated',
            gradientColors: generateGradientFromIndex(idCounter),
            index: idCounter,
          });
        }
      }

      // --- DALL-E via message-level metadata (catch images not already found above) ---
      // Handles both old format (msg.metadata.dalle.prompt) and new format (msg.metadata.image_gen_title)
      const msgDallePrompt = msg.metadata?.dalle?.prompt;
      const msgImageGenTitle = msg.metadata?.image_gen_title;
      if ((msgDallePrompt || msgImageGenTitle) && role !== 'user' && !processedNodeIds.has(node.id)) {
        const promptText = msgDallePrompt || msgImageGenTitle;
        const dedupeKey = `dalle::${convoTitle}::${node.id || promptText.slice(0, 80)}`;

        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          generated++;
          prompts.push({
            id: `img-${idCounter++}`,
            source: 'generated',
            prompt: promptText,
            conversationTitle: convoTitle,
            imagePath: null,
            hasRealImage: false,
            imageType: 'Generated',
            gradientColors: generateGradientFromIndex(idCounter),
            index: idCounter,
          });
        }
      }

      // User-uploaded images are intentionally excluded from the gallery
    }
  }

  const resolvedCount = prompts.filter(p => p.hasRealImage).length;
  console.log(`✓ Image extraction: ${generated} generated images (${resolvedCount} with real images, ${generated - resolvedCount} placeholders)`);

  return {
    prompts,
    stats: { generated, total: generated }
  };
}
