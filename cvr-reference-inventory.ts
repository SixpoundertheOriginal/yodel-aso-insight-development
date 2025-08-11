interface CVRReferenceInventory {
  file: string;
  lineNumber: number;
  currentCode: string;
  category: 'component' | 'hook' | 'util' | 'test' | 'type' | 'context';
  updateStrategy: 'replace-with-product-page' | 'replace-with-impressions' | 'replace-with-both' | 'remove';
  priority: 'high' | 'medium' | 'low';
}

const referenceInventory: CVRReferenceInventory[] = [
  {
    file: 'src/hooks/useAsoInsights.ts',
    lineNumber: 47,
    currentCode: 'cvrValue: data?.summary?.cvr?.value',
    category: 'hook',
    updateStrategy: 'replace-with-both',
    priority: 'high'
  },
  {
    file: 'src/hooks/useComparisonData.ts',
    lineNumber: 23,
    currentCode: 'cvr: number;',
    category: 'type',
    updateStrategy: 'replace-with-both',
    priority: 'high'
  },
  {
    file: 'src/pages/overview.tsx',
    lineNumber: 157,
    currentCode: '(data.summary.cvr ? data.summary.cvr.value : 0).toFixed(2)%',
    category: 'component',
    updateStrategy: 'replace-with-both',
    priority: 'high'
  },
  {
    file: 'src/pages/conversion-analysis.tsx',
    lineNumber: 73,
    currentCode: 'value={data.summary.cvr.value}',
    category: 'component',
    updateStrategy: 'replace-with-both',
    priority: 'high'
  },
  {
    file: 'src/utils/dateCalculations.ts',
    lineNumber: 52,
    currentCode: 'cvr: calculatePercentageChange(',
    category: 'util',
    updateStrategy: 'replace-with-both',
    priority: 'high'
  },
  {
    file: 'src/hooks/useComparisonData.test.tsx',
    lineNumber: 29,
    currentCode: 'cvr: { value: 50, delta: 3 }',
    category: 'test',
    updateStrategy: 'replace-with-both',
    priority: 'medium'
  },
  {
    file: 'src/pages/conversion-analysis.test.tsx',
    lineNumber: 57,
    currentCode: 'cvr: { value: 5.2, delta: 0.8 }',
    category: 'test',
    updateStrategy: 'replace-with-both',
    priority: 'medium'
  }
];

export default referenceInventory;
