```markdown
# Line Reader

A versatile and efficient Node.js library for reading large files line by line with advanced features like caching, random access, and batch processing.

## Features

- **Efficient streaming**: Reads files line by line without loading entire file into memory
- **Random access**: Jump to specific line numbers with `EnhancedLineReader`
- **Smart caching**: Built-in LRU cache for frequently accessed lines
- **Batch processing**: Process lines in batches for better performance
- **Flexible navigation**: Skip lines, read multiple lines, or restart from beginning
- **Resource management**: Automatic cleanup with async disposer pattern
- **TypeScript ready**: Full type definitions included

## Installation

```bash
npm install @supercat1337/line-reader
```

## Basic Usage

### Simple Line-by-Line Reading

```javascript
import { LineReader } from '@supercat1337/line-reader';

const reader = new LineReader('large-file.txt');

try {
  await reader.open();
  
  let line;
  while ((line = await reader.readLine()) !== null) {
    console.log(line);
  }
} finally {
  await reader.close();
}
```

### Using Async Disposer (Node.js 16+)

```javascript
import { LineReader } from '@supercat1337/line-reader';

// Automatic resource management
await using reader = new LineReader('large-file.txt');
await reader.open();

while (!reader.isEOF()) {
  const line = await reader.readLine();
  if (line !== null) {
    processLine(line);
  }
}
```

## Advanced Usage

### EnhancedLineReader with Caching

```javascript
import { EnhancedLineReader } from '@supercat1337/line-reader';

const reader = new EnhancedLineReader('large-file.txt', {
  cacheSize: 1000,
  encoding: 'utf-8'
});

await reader.open();

// Read specific line efficiently (cached for subsequent reads)
const line100 = await reader.readLineAt(99); // Line numbers are 0-based
console.log(`Line 100: ${line100}`);

// Continue reading sequentially
const nextLine = await reader.readLine();

await reader.close();
```

### Batch Processing

```javascript
import { LineReader, withBatchProcessor } from '@supercat1337/line-reader';

const reader = new LineReader('large-file.txt');
await reader.open();

const batchProcessor = withBatchProcessor(reader, 100); // Process 100 lines at a time

for await (const batch of batchProcessor.readBatches()) {
  // Process 100 lines as a batch
  await processBatch(batch);
  console.log(`Processed ${batch.length} lines`);
}

await reader.close();
```

### Skipping Lines and Multiple Reads

```javascript
const reader = new LineReader('data.csv');
await reader.open();

// Skip headers
await reader.skipLines(1);

// Read 10 data rows
const dataRows = await reader.readLines(10);

// Skip to line 1000
await reader.skipLines(989); // 1 header + 10 rows already read = 11 total

// Get current position in bytes
const position = await reader.getPosition();

await reader.close();
```

## API Reference

### LineReader

**Constructor**
```typescript
new LineReader(filePath: string, options?: {
  encoding?: BufferEncoding; // Default: 'utf-8'
  highWaterMark?: number;    // Default: 1MB
})
```

**Methods**
- `open(): Promise<this>` - Opens the file for reading
- `readLine(): Promise<string | null>` - Reads next line
- `skipLines(count: number): Promise<number>` - Skips specified number of lines
- `readLines(count: number): Promise<string[]>` - Reads multiple lines
- `getPosition(): Promise<number>` - Returns current byte position
- `close(): Promise<void>` - Closes the file
- `restart(): Promise<void>` - Restarts from beginning
- `isEOF(): boolean` - Checks if end of file reached
- `readAll(): Promise<string[]>` - Reads all remaining lines
- `[Symbol.asyncDispose](): Promise<void>` - Automatic cleanup

### EnhancedLineReader

Extends `LineReader` with caching capabilities.

**Constructor**
```typescript
new EnhancedLineReader(filePath: string, options?: {
  cacheSize?: number;       // Default: 1000
  encoding?: BufferEncoding; // Default: 'utf-8'
})
```

**Additional Methods**
- `readLineAt(lineNumber: number): Promise<string | null>` - Reads line at specific position
- `getCurrentLineNumber(): number` - Returns current line number
- `manageCache(): void` - Manages cache size (called automatically)

### withBatchProcessor

**Function**
```typescript
function withBatchProcessor(
  reader: LineReader,
  batchSize?: number // Default: 100
): { readBatches: () => AsyncGenerator<string[], void, unknown> }
```

## Performance Tips

1. **Use appropriate cache size**: For files with frequent random access, increase `cacheSize`
2. **Batch processing**: Use `withBatchProcessor` for bulk operations
3. **Stream when possible**: For sequential reads, use simple `LineReader`
4. **Manage resources**: Always close readers or use async disposer
5. **Adjust buffer size**: For very large files, increase `highWaterMark`

## Error Handling

```javascript
const reader = new LineReader('file.txt');

try {
  await reader.open();
  // ... operations
} catch (error) {
  console.error('Error reading file:', error);
} finally {
  try {
    await reader.close();
  } catch (closeError) {
    console.error('Error closing reader:', closeError);
  }
}
```

## License

MIT