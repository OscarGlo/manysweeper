export type Task = () => Promise<unknown>;

export class Semaphore {
  tasks: Task[];
  running: boolean;

  constructor() {
    this.tasks = [];
    this.running = false;
  }

  queue(callback: Task) {
    this.tasks.push(callback);
    if (!this.running) this.runNext();
  }

  async runNext() {
    if (this.tasks.length === 0) return;
    this.running = true;

    const task = this.tasks.shift();
    await task();

    await this.runNext();
    this.running = false;
  }
}
