import type { FilmProject } from "@film/schema";

export type ProjectBudgetTopSheet = {
  lineBudget: number;
  lineSpent: number;
  remaining: number;
  usedPercent: number;
  largestLine: FilmProject["expenses"][number] | null;
  nearBudgetCount: number;
  overBudgetCount: number;
};

export function budgetTopSheetForProject(project: FilmProject): ProjectBudgetTopSheet {
  const lineBudget = project.expenses.reduce((total, expense) => total + expense.budget, 0);
  const lineSpent = project.expenses.reduce((total, expense) => total + expense.spent, 0);
  const totalBudget = project.totalBudget > 0 ? project.totalBudget : lineBudget;
  const spent = project.spentBudget > 0 ? project.spentBudget : lineSpent;
  const largestLine = [...project.expenses].sort((left, right) => right.spent - left.spent)[0] ?? null;

  return {
    lineBudget,
    lineSpent,
    remaining: totalBudget - spent,
    usedPercent: totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0,
    largestLine,
    nearBudgetCount: project.expenses.filter((expense) => (
      expense.budget > 0
      && expense.spent <= expense.budget
      && expense.spent / expense.budget >= 0.85
    )).length,
    overBudgetCount: project.expenses.filter((expense) => (
      expense.budget > 0 && expense.spent > expense.budget
    )).length,
  };
}
