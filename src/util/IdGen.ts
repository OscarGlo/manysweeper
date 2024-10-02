export interface IdGenOptions {
  min?: number;
  max?: number;
  rotate?: boolean;
}

export type Id = number;

export class IdGen {
  private options?: IdGenOptions;
  private ids;
  private current;

  constructor(options?: IdGenOptions) {
    this.options = options;
    this.reset();
  }

  reset() {
    this.ids = new Set();
    this.current = this.options.min ?? 0;
  }

  get(): Id | null {
    const min = this.options?.min ?? 0;
    const max = this.options?.max ?? Number.MAX_SAFE_INTEGER;
    const d = max - min;
    for (let i = 0; i < d; i++) {
      const id = (this.options?.rotate ? (i + this.current) % d : i) + min;
      if (!this.ids.has(id)) {
        this.current = id;
        this.ids.add(id);
        return id;
      }
    }
    return null;
  }

  delete(id: Id) {
    this.ids.delete(id);
  }
}
