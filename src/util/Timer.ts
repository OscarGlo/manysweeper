export interface TimerOptions {
  max?: number;
}

export class Timer {
  time: number;

  private interval?: NodeJS.Timeout;
  private options?: TimerOptions;

  constructor(options?: TimerOptions) {
    this.options = options;
  }

  start() {
    if (this.interval == null)
      this.interval = setInterval(() => {
        this.time++;

        if (this.options?.max && this.time >= this.options.max) this.stop();
      }, 1000);
  }

  stop() {
    clearInterval(this.interval);
    this.interval = undefined;
  }

  reset() {
    this.stop();
    this.time = 0;
  }
}
