export class EnhancedLineReader extends LineReader {
    /**
     * Constructor for EnhancedLineReader
     * @param {string} filePath - Path to the file
     * @param {object} [options] - Options for reading
     * @param {number} [options.cacheSize=1000] - Cache size for line reading
     * @param {BufferEncoding} [options.encoding='utf-8'] - File encoding
     */
    constructor(filePath: string, options?: {
        cacheSize?: number;
        encoding?: BufferEncoding;
    });
    cache: Map<any, any>;
    cacheSize: number;
    linePointer: number;
    /**
     * Reads a line at a specific line number
     * @param {number} lineNumber - Line number from the beginning
     * @returns {Promise<string|null>}
     */
    readLineAt(lineNumber: number): Promise<string | null>;
    /**
     * Manages cache size by removing oldest entries
     */
    manageCache(): void;
    /**
     * Returns the current line number
     * @returns {number}
     */
    getCurrentLineNumber(): number;
}
export class LineReader {
    /**
     * @param {string} filePath - Path to the file
     * @param {object} [options] - File reading options
     * @param {BufferEncoding} [options.encoding='utf-8'] - File encoding
     * @param {number} [options.highWaterMark=1024*1024] - Read buffer size in bytes
     */
    constructor(filePath: string, options?: {
        encoding?: BufferEncoding;
        highWaterMark?: number;
    });
    filePath: string;
    options: {
        encoding: BufferEncoding;
        highWaterMark: number;
    };
    /** @type {import('readline').Interface|null} */
    rl: import("readline").Interface | null;
    lineIterator: NodeJS.AsyncIterator<string, undefined, any>;
    isClosed: boolean;
    currentLine: string;
    /**
     * Opens the file for reading
     */
    open(): Promise<this>;
    /**
     * Reads next line from the file
     * @returns {Promise<string|null>} Line or null if end of file reached
     */
    readLine(): Promise<string | null>;
    /**
     * Skips specified number of lines
     * @param {number} count - Number of lines to skip
     * @returns {Promise<number>} Actual number of lines skipped
     */
    skipLines(count: number): Promise<number>;
    /**
     * Reads multiple lines in one call
     * @param {number} count - Number of lines to read
     * @returns {Promise<string[]>} Array of lines
     */
    readLines(count: number): Promise<string[]>;
    /**
     * Returns current approximate position in bytes
     * @returns {Promise<number>} Position in file
     */
    getPosition(): Promise<number>;
    /**
     * Closes file and releases resources
     */
    close(): Promise<void>;
    /**
     * Restarts reading from the beginning of the file
     */
    restart(): Promise<void>;
    /**
     * Checks if end of file is reached
     * @returns {boolean}
     */
    isEOF(): boolean;
    /**
     * Reads all remaining lines (use with caution on large files!)
     * @returns {Promise<string[]>} All remaining lines
     */
    readAll(): Promise<string[]>;
    /**
     * Destructor - automatically closes file when object is disposed
     */
    [Symbol.asyncDispose](): Promise<void>;
}
/**
 * @param {LineReader} reader - LineReader instance
 * @param {number} batchSize - Batch size
 * @returns {{readBatches: ()=>AsyncGenerator<string[], void, unknown>}} Decorated object with batch reading method
 */
export function withBatchProcessor(reader: LineReader, batchSize?: number): {
    readBatches: () => AsyncGenerator<string[], void, unknown>;
};
