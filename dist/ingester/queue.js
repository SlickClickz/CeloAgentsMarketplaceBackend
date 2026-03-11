"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProcessor = registerProcessor;
exports.enqueue = enqueue;
exports.getQueueSize = getQueueSize;
exports.getQueueStatus = getQueueStatus;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000;
const queue = [];
let isProcessing = false;
let processor = null;
// ─────────────────────────────────────────
// Register the function that processes
// each event (set by ingester/index.ts)
// ─────────────────────────────────────────
function registerProcessor(fn) {
    processor = fn;
}
// ─────────────────────────────────────────
// Add a new event to the queue
// ─────────────────────────────────────────
function enqueue(event) {
    const alreadyQueued = queue.some((item) => item.event.agentId === event.agentId);
    if (alreadyQueued) {
        console.log(`[Queue] Agent ${event.agentId} already in queue, skipping`);
        return;
    }
    queue.push({ event, attempts: 0, lastAttempt: null });
    console.log(`[Queue] Enqueued agent ${event.agentId}. Queue size: ${queue.length}`);
    if (!isProcessing) {
        processNext();
    }
}
// ─────────────────────────────────────────
// Process queue items one at a time
// ─────────────────────────────────────────
async function processNext() {
    if (!processor) {
        console.warn("[Queue] No processor registered yet");
        return;
    }
    const item = queue[0];
    if (!item) {
        isProcessing = false;
        return;
    }
    isProcessing = true;
    try {
        await processor(item.event);
        queue.shift(); // success — remove from queue
        console.log(`[Queue] Processed agent ${item.event.agentId}. Remaining: ${queue.length}`);
    }
    catch (err) {
        item.attempts += 1;
        item.lastAttempt = new Date();
        if (item.attempts >= MAX_ATTEMPTS) {
            console.error(`[Queue] Agent ${item.event.agentId} failed after ${MAX_ATTEMPTS} attempts, dropping`);
            queue.shift();
        }
        else {
            console.warn(`[Queue] Agent ${item.event.agentId} failed (attempt ${item.attempts}/${MAX_ATTEMPTS}), retrying in ${RETRY_DELAY_MS}ms`);
            // Move to back of queue for retry
            queue.push(queue.shift());
            await sleep(RETRY_DELAY_MS);
        }
    }
    // Process next item
    setImmediate(processNext);
}
function getQueueSize() {
    return queue.length;
}
function getQueueStatus() {
    return { size: queue.length, isProcessing };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=queue.js.map