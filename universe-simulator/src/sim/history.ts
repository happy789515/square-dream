export type SimAction =
  | { kind: "destroy"; planetId: string }
  | { kind: "restore"; planetId: string }
  | { kind: "reset"; destroyedIds: string[]; simDays: number };

export class HistoryStack {
  private readonly stack: SimAction[] = [];

  push(action: SimAction): void {
    this.stack.push(action);
  }

  pop(): SimAction | undefined {
    return this.stack.pop();
  }

  clear(): void {
    this.stack.length = 0;
  }

  get canUndo(): boolean {
    return this.stack.length > 0;
  }
}