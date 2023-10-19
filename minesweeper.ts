function shuffle(arr: any[]) {
   arr = [...arr];
   const len = arr.length;
   for (let i = 0; i < len; i++) {
      const j = Math.floor(Math.random() * len);
      [arr[j], arr[i]] = [arr[i], arr[j]];
   }
   return arr;
}

export function arrayFrom<T>(size: number, get: (i: number) => T): T[] {
   return new Array(size).fill(0).map((_, i) => get(i));
}

export function matrixFrom<T>(width, height, get: (x: number, y: number) => T): T[][] {
   return arrayFrom(height, (y) => arrayFrom(width, (x) => get(x, y)));
}

export function generateMines(width: number, height: number, mineCount: number): boolean[][] {
   const positions = arrayFrom(width * height, (i) =>
      [i % width, Math.floor(i / width)]
   );
   const mines = shuffle(positions).slice(0, mineCount);
   
   return matrixFrom(width, height, (x, y) =>
      mines.some((m) => m[0] === x && m[1] === y)
   );
}

function forEachNeighbor<T>(arr: T[][], pos: [number, number], cb: (t: T, x: number, y: number) => any) {
   const width = arr[0].length;
   const height = arr.length;
   
   const x = pos[0];
   const y = pos[1];
   
   const mx = Math.min(x + 1, width - 1);
   const my = Math.min(y + 1, height - 1);
   
   for (let x_ = Math.max(x - 1, 0); x_ <= mx; x_++)
      for (let y_ = Math.max(y - 1, 0); y_ <= my; y_++)
         cb(arr[y_][x_], x_, y_);
}

export function countNeighborMines(mines: boolean[][]): number[][] {
   const width = mines[0].length;
   const height = mines.length;
   
   return matrixFrom(width, height, (x, y) => {
      let count = 0;
      forEachNeighbor(mines, [x, y], (mine, x_, y_) => {
         if ((x_ != x || y_ != y) && mine)
            count++;
      });
      return count;
   });
}

export function open(boardState: number[][], counts: number[][], pos: [number, number]): number[][] {
   const queue = [pos];
   const visited = [];
   while (queue.length > 0) {
      const next = queue.pop();
      visited.push(next);
      
      const x = next[0];
      const y = next[1];
      
      const n = counts[y][x];
      boardState[y][x] = n;
      
      if (n > 0) continue;
      
      forEachNeighbor(boardState, [x, y], (_, x_, y_) => {
         if (!visited.some(p => p[0] === x_ && p[1] === y_))
            queue.unshift([x_, y_]);
      });
   }
   return boardState;
}

export function chord(boardState: number[][], mines: boolean[][], counts: number[][], pos: any): [number[][], boolean] {
   const x = pos[0];
   const y = pos[1];
   
   let flagCount = 0;
   forEachNeighbor(boardState, [x, y], (s) => {
      if (s === -2) flagCount++;
   });
   if (flagCount === counts[y][x]) {
      // Check for mines
      let failed = false;
      forEachNeighbor(boardState, [x, y], (s, x_, y_) => {
         if (s === -1 && mines[y_][x_])
            failed = true;
      });
      if (failed)
         return [boardState, true];
      
      forEachNeighbor(boardState, [x, y], (s, x_, y_) => {
         if (s === -1)
            boardState = open(boardState, counts, [x_, y_]);
      });
   }
   return [boardState, false];
}
