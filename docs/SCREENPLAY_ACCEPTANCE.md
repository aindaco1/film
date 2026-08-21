# Production Screenplay Acceptance

This is source-free acceptance evidence for running a real Big Sword Final Draft file through Film's local production-planning chain on August 21, 2026. The fixture remains outside the Film repository. The runner does not make network requests and its output excludes the source path, screenplay title/text, character names, scene headings, and element names.

## Result

| Stage | Aggregate evidence |
| --- | --- |
| Import | 387,364 bytes; 96 scenes; 75 numbered scenes; 96 scenes with parsed locations; 0 parser warnings |
| Breakdown | 91 elements; 594 occurrences; 37 cast; 54 locations |
| Schedule | 16 generated shoot days; all 96 strips assigned; 0 unassigned; 0 blocking conflicts |
| Scenario review | 16 warnings; 18 assumption breaches retained for producer review |
| Estimate | 6 itemized lines; 84 cast work days; 80 location-day uses; sample total $56,144.00 |
| First call sheet | 6 scenes; 3 cast calls |
| First-day sides | 6 scenes; 0 missing scenes |
| First production report | 6 planned scenes; 3 cast; 10 crew |

The schedule is intentionally mechanical: it creates enough undated days for six scenes per day. Warnings and micro-budget assumption breaches are evidence that the review surfaces remain active; they are not parser failures or an approved Big Sword shooting plan. The estimate uses explicit synthetic smoke-test rates and must not be treated as a production budget, payroll calculation, union determination, or legal/compliance result.

## Rerun Contract

```bash
npm run accept:screenplay -- /absolute/path/to/screenplay.fdx
```

The command must fail if no scenes parse, any scene remains unassigned, sides or the report diverge from the generated call sheet, or the estimate does not match the generated schedule. Automated synthetic coverage also asserts that screenplay dialogue, headings, and character names do not enter the evidence object.
