import test from 'ava';
import { LineReader, withBatchProcessor } from './line-reader.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_FILE = path.join(process.cwd(), 'src', 'test-file.txt');
const TEST_LINES = [
  'First line',
  'Second line',
  'Third line',
  'Fourth line',
  'Fifth line',
];

test.before(async () => {
  await fs.writeFile(TEST_FILE, TEST_LINES.join('\n'), 'utf-8');
});

test.after.always(async () => {
  await fs.unlink(TEST_FILE).catch(() => {});
});

test('LineReader: open, readLine, close', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  const line1 = await reader.readLine();
  t.is(line1, TEST_LINES[0]);
  await reader.close();
  t.true(reader.isEOF());
});

test('LineReader: open twice throws', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await t.throwsAsync(() => reader.open(), { message: /already open/ });
  await reader.close();
});

test('LineReader: readLine before open throws', async t => {
  const reader = new LineReader(TEST_FILE);
  await t.throwsAsync(() => reader.readLine(), { message: /not open/ });
});

test('LineReader: skipLines/readLines after EOF throws', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await reader.readAll();
  await t.throwsAsync(() => reader.skipLines(2), { message: /not open/ });
  await t.throwsAsync(() => reader.readLines(2), { message: /not open/ });
  await reader.close();
});

test('LineReader: getPosition returns 0 if not open', async t => {
  const reader = new LineReader(TEST_FILE);
  const pos = await reader.getPosition();
  t.is(pos, 0);
});

test('LineReader: close is idempotent', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await reader.close();
  await t.notThrowsAsync(() => reader.close());
});

test('LineReader: readLine error closes reader', async t => {
  // Simulate error by monkey-patching lineIterator.next
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  reader.lineIterator.next = async () => { throw new Error('Simulated'); };
  await t.throwsAsync(() => reader.readLine(), { message: /Simulated/ });
  t.true(reader.isEOF());
});

test('LineReader: restart after close reopens', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await reader.close();
  await reader.restart();
  const line = await reader.readLine();
  t.is(line, TEST_LINES[0]);
  await reader.close();
});

test('LineReader: [Symbol.asyncDispose] closes file', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await reader[Symbol.asyncDispose]();
  t.true(reader.isEOF());
});

test('LineReader: readLine throws if lineIterator not initialized', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  // Simulate missing lineIterator
  reader.lineIterator = null;
  await t.throwsAsync(() => reader.readLine(), { message: /Line iterator is not initialized/ });
  await reader.close();
});

test('LineReader: close does not destroy already destroyed input', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  // Simulate destroyed input
  if (reader.rl && reader.rl.input) {
    reader.rl.input.destroyed = true;
  }
  await t.notThrowsAsync(() => reader.close());
});

test('LineReader: readLines', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  const lines = await reader.readLines(3);
  t.deepEqual(lines, TEST_LINES.slice(0, 3));
  await reader.close();
});

test('LineReader: skipLines', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  const skipped = await reader.skipLines(2);
  t.is(skipped, 2);
  const line = await reader.readLine();
  t.is(line, TEST_LINES[2]);
  await reader.close();
});

test('LineReader: getPosition increases', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  const pos1 = await reader.getPosition();
  await reader.readLine();
  const pos2 = await reader.getPosition();
  t.true(pos2 >= pos1);
  await reader.close();
});

test('LineReader: restart', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await reader.readLine();
  await reader.restart();
  const line = await reader.readLine();
  t.is(line, TEST_LINES[0]);
  await reader.close();
});

test('LineReader: readAll', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  const all = await reader.readAll();
  t.deepEqual(all, TEST_LINES);
  await reader.close();
});

test('LineReader: isEOF after reading all', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  await reader.readAll();
  t.true(reader.isEOF());
  await reader.close();
});

test('withBatchProcessor: yields batches', async t => {
  const reader = new LineReader(TEST_FILE);
  await reader.open();
  const batcher = withBatchProcessor(reader, 2);
  const batches = [];
  for await (const batch of batcher.readBatches()) {
    batches.push(batch);
  }
  t.deepEqual(batches, [
    TEST_LINES.slice(0, 2),
    TEST_LINES.slice(2, 4),
    TEST_LINES.slice(4, 5),
  ]);
  await reader.close();
});
