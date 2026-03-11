import { ERC8004RegisteredEvent } from "../types/erc8004";
type ProcessorFn = (event: ERC8004RegisteredEvent) => Promise<void>;
export declare function registerProcessor(fn: ProcessorFn): void;
export declare function enqueue(event: ERC8004RegisteredEvent): void;
export declare function getQueueSize(): number;
export declare function getQueueStatus(): {
    size: number;
    isProcessing: boolean;
};
export {};
