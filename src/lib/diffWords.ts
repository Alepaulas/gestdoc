// Diff de palavras baseado em LCS (Longest Common Subsequence)
// Sem dependências externas — funciona inteiramente em memória.

export type DiffOp = {
  type: "equal" | "insert" | "delete";
  text: string;
};

// Tokeniza preservando espaços/pontuação como tokens separados,
// para um diff mais granular e legível.
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

export function diffWords(oldText: string, newText: string): DiffOp[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);
  const n = a.length;
  const m = b.length;

  // Tabela LCS (programação dinâmica)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Reconstrói o caminho
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", text: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "delete", text: a[i] });
      i++;
    } else {
      ops.push({ type: "insert", text: b[j] });
      j++;
    }
  }
  while (i < n) { ops.push({ type: "delete", text: a[i] }); i++; }
  while (j < m) { ops.push({ type: "insert", text: b[j] }); j++; }

  // Mescla operações adjacentes do mesmo tipo
  const merged: DiffOp[] = [];
  for (const op of ops) {
    const last = merged[merged.length - 1];
    if (last && last.type === op.type) {
      last.text += op.text;
    } else {
      merged.push({ ...op });
    }
  }
  return merged;
}

export type DiffStats = {
  added: number;
  removed: number;
  unchanged: number;
};

export function computeStats(ops: DiffOp[]): DiffStats {
  let added = 0, removed = 0, unchanged = 0;
  for (const op of ops) {
    const words = op.text.trim().split(/\s+/).filter(Boolean).length;
    if (op.type === "insert") added += words;
    else if (op.type === "delete") removed += words;
    else unchanged += words;
  }
  return { added, removed, unchanged };
}
