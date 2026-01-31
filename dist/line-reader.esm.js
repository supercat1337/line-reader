import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// @ts-check


class LineReader {
    /**
     * @param {string} filePath - Path to the file
     * @param {object} [options] - File reading options
     * @param {BufferEncoding} [options.encoding='utf-8'] - File encoding
     * @param {number} [options.highWaterMark=1024*1024] - Read buffer size in bytes
     */
    constructor(filePath, options = {}) {
        this.filePath = filePath;
        this.options = {
            /** @type {BufferEncoding} */
            encoding: 'utf-8',
            highWaterMark: 1024 * 1024, // 1MB
            ...options,
        };

        /** @type {import('readline').Interface|null} */
        this.rl = null;
        this.lineIterator = null;
        this.isClosed = false;
        this.currentLine = null;
    }

    /**
     * Opens the file for reading
     */
    async open() {
        if (this.rl) {
            throw new Error('File is already open');
        }

        const fileStream = createReadStream(this.filePath, {
            encoding: this.options.encoding,
            highWaterMark: this.options.highWaterMark,
        });

        this.rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        // Create async iterator
        this.lineIterator = this.rl[Symbol.asyncIterator]();

        return this;
    }

    /**
     * Reads next line from the file
     * @returns {Promise<string|null>} Line or null if end of file reached
     */
    async readLine() {
        if (!this.rl) {
            throw new Error('File is not open. Call open() first');
        }

        if (this.isClosed) {
            return null;
        }

        if (!this.lineIterator) {
            throw new Error('Line iterator is not initialized');
        }

        try {
            const { value, done } = await this.lineIterator.next();

            if (done) {
                await this.close();
                return null;
            }

            this.currentLine = value;
            return value;
        } catch (error) {
            await this.close();
            throw error;
        }
    }

    /**
     * Skips specified number of lines
     * @param {number} count - Number of lines to skip
     * @returns {Promise<number>} Actual number of lines skipped
     */
    async skipLines(count) {
        let skipped = 0;

        for (let i = 0; i < count; i++) {
            const line = await this.readLine();
            if (line === null) break;
            skipped++;
        }

        return skipped;
    }

    /**
     * Reads multiple lines in one call
     * @param {number} count - Number of lines to read
     * @returns {Promise<string[]>} Array of lines
     */
    async readLines(count) {
        const lines = [];

        for (let i = 0; i < count; i++) {
            const line = await this.readLine();
            if (line === null) break;
            lines.push(line);
        }

        return lines;
    }

    /**
     * Returns current approximate position in bytes
     * @returns {Promise<number>} Position in file
     */
    async getPosition() {
        // @ts-ignore
        if (!this.rl || !this.rl.input) {
            return 0;
        }

        // Get position from stream
        // @ts-ignore
        return this.rl.input.bytesRead || 0;
    }

    /**
     * Closes file and releases resources
     */
    async close() {
        if (this.isClosed) return;

        this.isClosed = true;

        if (this.rl) {
            this.rl.close();
            // @ts-ignore
            if (this.rl.input && !this.rl.input.destroyed) {
                // @ts-ignore
                this.rl.input.destroy();
            }
            this.rl = null;
        }

        this.lineIterator = null;
    }

    /**
     * Restarts reading from the beginning of the file
     */
    async restart() {
        await this.close();
        this.isClosed = false;
        await this.open();
    }

    /**
     * Checks if end of file is reached
     * @returns {boolean}
     */
    isEOF() {
        return this.isClosed;
    }

    /**
     * Reads all remaining lines (use with caution on large files!)
     * @returns {Promise<string[]>} All remaining lines
     */
    async readAll() {
        const lines = [];

        let line;
        while ((line = await this.readLine()) !== null) {
            lines.push(line);
        }

        return lines;
    }

    /**
     * Destructor - automatically closes file when object is disposed
     */
    async [Symbol.asyncDispose]() {
        await this.close();
    }
}

// Decorator for batch processing
/**
 * @param {LineReader} reader - LineReader instance
 * @param {number} batchSize - Batch size
 * @returns {{readBatches: ()=>AsyncGenerator<string[], void, unknown>}} Decorated object with batch reading method
 */
function withBatchProcessor(reader, batchSize = 1000) {
    return {
        async *readBatches() {
            while (!reader.isEOF()) {
                const batch = await reader.readLines(batchSize);
                if (batch.length === 0) break;
                yield batch;
            }
        },
    };
}

// @ts-check


class EnhancedLineReader extends LineReader {
    /**
     * Constructor for EnhancedLineReader
     * @param {string} filePath - Path to the file
     * @param {object} [options] - Options for reading
     * @param {number} [options.cacheSize=1000] - Cache size for line reading
     * @param {BufferEncoding} [options.encoding='utf-8'] - File encoding
     */
    constructor(filePath, options = {}) {
        super(filePath, options);
        this.cache = new Map();
        this.cacheSize = options.cacheSize || 1000;
        this.linePointer = 0;
    }

    /**
     * Reads a line at a specific line number
     * @param {number} lineNumber - Line number from the beginning
     * @returns {Promise<string|null>}
     */
    async readLineAt(lineNumber) {
        if (lineNumber < 1) {
            throw new Error('Line number must be greater than 0');
        }

        // Check cache first
        if (this.cache.has(lineNumber)) {
            return this.cache.get(lineNumber);
        }

        // If requested line is before current pointer, restart reading
        if (lineNumber <= this.linePointer) {
            await this.restart();
            this.linePointer = 0;
        }

        // Skip lines to reach the desired line
        await this.skipLines(lineNumber - this.linePointer - 1);

        // Read the desired line
        const line = await this.readLine();

        if (line !== null) {
            this.cache.set(lineNumber, line);
            this.manageCache();
        }

        return line;
    }

    /**
     * Manages cache size by removing oldest entries
     */
    manageCache() {
        if (this.cache.size > this.cacheSize) {
            // Delete oldest entries
            const keys = Array.from(this.cache.keys()).sort((a, b) => a - b);
            const toRemove = keys.slice(0, Math.floor(this.cacheSize / 2));

            for (const key of toRemove) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Redefines readLine to update linePointer and cache
     * @returns {Promise<string|null>}
     */
    async readLine() {
        const line = await super.readLine();

        if (line !== null) {
            this.linePointer++;
            this.cache.set(this.linePointer, line);
            this.manageCache();
        }

        return line;
    }

    /**
     * Returns the current line number
     * @returns {number}
     */
    getCurrentLineNumber() {
        return this.linePointer;
    }
}

export { EnhancedLineReader, LineReader, withBatchProcessor };
