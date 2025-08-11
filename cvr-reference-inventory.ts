interface CVRRefactorTask {
  file: string;
  lineNumber: number;
  currentCode: string;
  action: 'replace' | 'remove' | 'update_logic';
  newCode?: string;
  notes?: string;
}

// All legacy cvr references have been removed. This list remains for future audits.
const cvrRefactorTasks: CVRRefactorTask[] = [];

export default cvrRefactorTasks;
