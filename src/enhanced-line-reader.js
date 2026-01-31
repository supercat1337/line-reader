// @ts-check

import { LineReader } from './line-reader.js';

export class EnhancedLineReader extends LineReader {
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
