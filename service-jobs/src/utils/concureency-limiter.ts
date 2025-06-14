class ConcurrencyLimiter {
    private active = 0;
    private queue: (() => void)[] = [];

    constructor(private readonly maxConcurrency: number) {}

    async run<T>(task: () => Promise<T>): Promise<T> {
        if (this.active >= this.maxConcurrency) {
            await new Promise<void>((resolve) => this.queue.push(resolve));
        }

        this.active++;

        try {
            return await task();
        } finally {
            this.active--;
            if (this.queue.length > 0) {
                const next = this.queue.shift();
                if (next) next();
            }
        }
    }
}

export default ConcurrencyLimiter;
