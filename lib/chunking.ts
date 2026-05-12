export interface TextChunk {
  content: string;
  index: number;
  tokenCount: number;
  metadata: {
    startChar: number;
    endChar: number;
  };
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  maxChunks?: number;
}

const DEFAULT_CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '500');
const DEFAULT_CHUNK_OVERLAP = parseInt(process.env.CHUNK_OVERLAP || '50');
const DEFAULT_MAX_CHUNKS = parseInt(process.env.MAX_CHUNKS_PER_DOCUMENT || '100');

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): TextChunk[] {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    chunkOverlap = DEFAULT_CHUNK_OVERLAP,
    maxChunks = DEFAULT_MAX_CHUNKS,
  } = options;

  const chunks: TextChunk[] = [];
  const sentences = splitIntoSentences(text);

  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
    const tokenCount = estimateTokenCount(potentialChunk);

    if (tokenCount > chunkSize && currentChunk) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
        tokenCount: estimateTokenCount(currentChunk),
        metadata: {
          startChar: currentStartChar,
          endChar: currentStartChar + currentChunk.length,
        },
      });

      if (chunks.length >= maxChunks) {
        break;
      }

      const overlapText = getOverlapText(currentChunk, chunkOverlap);
      currentChunk = overlapText + sentence;
      currentStartChar += currentChunk.length - overlapText.length;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk && chunks.length < maxChunks) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: estimateTokenCount(currentChunk),
      metadata: {
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    });
  }

  return chunks;
}

function splitIntoSentences(text: string): string[] {
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  const sentences = text.match(sentenceRegex) || [];

  if (sentences.length === 0) {
    const paragraphs = text.split(/\n+/);
    return paragraphs.filter(p => p.trim().length > 0);
  }

  return sentences.map(s => s.trim()).filter(s => s.length > 0);
}

function getOverlapText(text: string, overlapSize: number): string {
  const words = text.split(/\s+/);
  const overlapWords = Math.min(overlapSize, words.length);
  return words.slice(-overlapWords).join(' ') + ' ';
}

export function chunkByParagraphs(
  text: string,
  maxTokensPerChunk: number = 500
): TextChunk[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: TextChunk[] = [];
  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + trimmedParagraph;
    const tokenCount = estimateTokenCount(potentialChunk);

    if (tokenCount > maxTokensPerChunk && currentChunk) {
      chunks.push({
        content: currentChunk,
        index: chunkIndex++,
        tokenCount: estimateTokenCount(currentChunk),
        metadata: {
          startChar: currentStartChar,
          endChar: currentStartChar + currentChunk.length,
        },
      });

      currentChunk = trimmedParagraph;
      currentStartChar += currentChunk.length;
    } else {
      currentChunk = potentialChunk;
    }
  }

  if (currentChunk) {
    chunks.push({
      content: currentChunk,
      index: chunkIndex,
      tokenCount: estimateTokenCount(currentChunk),
      metadata: {
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    });
  }

  return chunks;
}

export function chunkByTokens(
  text: string,
  maxTokens: number = 500,
  overlap: number = 50
): TextChunk[] {
  const words = text.split(/\s+/);
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;
  let startChar = 0;

  for (let i = 0; i < words.length; ) {
    let currentWords: string[] = [];
    let tokenCount = 0;

    while (i < words.length && tokenCount < maxTokens) {
      currentWords.push(words[i]);
      tokenCount = estimateTokenCount(currentWords.join(' '));
      i++;
    }

    const content = currentWords.join(' ');
    chunks.push({
      content,
      index: chunkIndex++,
      tokenCount,
      metadata: {
        startChar,
        endChar: startChar + content.length,
      },
    });

    startChar += content.length;

    if (overlap > 0 && i < words.length) {
      i -= Math.min(overlap, currentWords.length);
    }
  }

  return chunks;
}
