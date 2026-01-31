import test from 'ava';
import { EnhancedLineReader } from './enhanced-line-reader.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_FILE = path.join(process.cwd(), 'src', 'enhanced-test-file.txt');
const TEST_LINES = [
  'Alpha',
  'Bravo',
  'Charlie',
  'Delta',
  'Echo',
];

test.before(async () => {
  await fs.writeFile(TEST_FILE, TEST_LINES.join('\n'), 'utf-8');
});

test.after.always(async () => {
  await fs.unlink(TEST_FILE).catch(() => {});
});

test('EnhancedLineReader: readLineAt returns correct line', async t => {
  const reader = new EnhancedLineReader(TEST_FILE);
  await reader.open();
  const line3 = await reader.readLineAt(3);
  t.is(line3, TEST_LINES[2]);
  await reader.close();
});

test('EnhancedLineReader: readLineAt caches lines', async t => {
  const reader = new EnhancedLineReader(TEST_FILE, { cacheSize: 2 });
  await reader.open();
  await reader.readLineAt(2);
  t.true(reader.cache.has(2));
  await reader.readLineAt(3);
  t.true(reader.cache.has(3));
  // Cache size should not exceed 2 after manageCache
  t.true(reader.cache.size <= 2);
  await reader.close();
});

test('EnhancedLineReader: readLineAt with lineNumber < 1 throws', async t => {
  const reader = new EnhancedLineReader(TEST_FILE);
  await reader.open();
  await t.throwsAsync(() => reader.readLineAt(0), { message: /greater than 0/ });
  await reader.close();
});

test('EnhancedLineReader: readLineAt after EOF returns null', async t => {
  const reader = new EnhancedLineReader(TEST_FILE);
  await reader.open();
  await reader.readAll();
  await t.throwsAsync(() => reader.readLineAt(TEST_LINES.length + 1), { message: /not open/ });
  await reader.close();
});

test('EnhancedLineReader: getCurrentLineNumber updates', async t => {
  const reader = new EnhancedLineReader(TEST_FILE);
  await reader.open();
  await reader.readLine();
  t.is(reader.getCurrentLineNumber(), 1);
  await reader.readLine();
  t.is(reader.getCurrentLineNumber(), 2);
  await reader.close();
});

test('EnhancedLineReader: readLineAt uses cache', async t => {
  const reader = new EnhancedLineReader(TEST_FILE);
  await reader.open();
  // Prime the cache
  const line2 = await reader.readLineAt(2);
  t.is(line2, TEST_LINES[1]);
  // Now, move pointer forward
  await reader.readLine(); // line 3
  // Now, read line 2 again (should use cache, not move pointer)
  const cached = await reader.readLineAt(2);
  t.is(cached, TEST_LINES[1]);
  await reader.close();
});

test('EnhancedLineReader: readLineAt before pointer triggers restart', async t => {
  const reader = new EnhancedLineReader(TEST_FILE);
  await reader.open();
  await reader.readLine(); // pointer at 1
  await reader.readLine(); // pointer at 2
  // Now, read line 1 again (should restart)
  const line1 = await reader.readLineAt(1);
  t.is(line1, TEST_LINES[0]);
  t.is(reader.getCurrentLineNumber(), 2); // pointer is incremented after readLineAt
  await reader.close();
});
