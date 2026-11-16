| defect | library | detected | 95% CI | errors | exactly minimal | hand minimum | median shrunk steps | median cases to first failure |
|---|---|---|---|---|---|---|---|---|
| remove-workspace-keeps-windows | hegel | 50/50 | 0.929-1.000 | 0 | 44/50 | 3 | 3 | 6 |
| remove-workspace-keeps-windows | proptest | 50/50 | 0.929-1.000 | 0 | 14/50 | 3 | 4 | 6 |
| close-pane-keeps-stale-focus | hegel | 50/50 | 0.929-1.000 | 0 | 50/50 | 2 | 2 | 5 |
| close-pane-keeps-stale-focus | proptest | 50/50 | 0.929-1.000 | 0 | 40/50 | 2 | 2 | 3.5 |
| remove-output-drops-workspace | hegel | 50/50 | 0.929-1.000 | 0 | 50/50 | 2 | 2 | 2.5 |
| remove-output-drops-workspace | proptest | 50/50 | 0.929-1.000 | 0 | 50/50 | 2 | 2 | 2 |
| close-window-keeps-fullscreen | hegel | 50/50 | 0.929-1.000 | 0 | 50/50 | 3 | 3 | 14 |
| close-window-keeps-fullscreen | proptest | 50/50 | 0.929-1.000 | 0 | 37/50 | 3 | 3 | 14 |
| swap-windows-duplicates | hegel | 50/50 | 0.929-1.000 | 0 | 30/50 | 4 | 4 | 7 |
| swap-windows-duplicates | proptest | 50/50 | 0.929-1.000 | 0 | 20/50 | 4 | 5 | 15.5 |
| move-window-to-workspace-noop | hegel | 50/50 | 0.929-1.000 | 0 | 50/50 | 3 | 3 | 4 |
| move-window-to-workspace-noop | proptest | 50/50 | 0.929-1.000 | 0 | 28/50 | 3 | 3 | 3 |

Clean run, hegel: no failure in 50000 cases of up to 50 steps (seed 0).
Clean run, proptest: no failure in 50000 cases of up to 50 steps (seed 0).
