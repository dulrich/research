# Catalogue of seeded defects (pre-registered)

Six mutants of the target's `World` (crate `crucible-layout`, pinned commit `d02df23`), each a one-hunk diff under `mutants/`, written before any seeded-defect run. The hand-minimal step count is the shortest rule sequence that can trip the declared oracle, worked out from the verbs' documented behaviour and counted in the harnesses' rule set (every rule is one step; a no-op rule would be a wasted step). No minimum below is chosen or changed after a result.

The oracle (identical in both harnesses, one shared model file) runs after every step: the target's own `check_invariants`, the live-window set, output count and workspace count against the model, visible, fullscreen and marked windows all live, and a tiled-geometry check. Rules also assert a few post-conditions on a successful call (below, mutant 6). The oracle checks structure, counts and these post-conditions; it does not check that every valid move or toggle took effect (validity threat E1, repeated in the README), so each mutant below was chosen to be visible to it, and each entry names the check expected to trip first and why it can see the mutant.

| id | file | verb area | mutation | hand-minimal steps | expected first check |
|---|---|---|---|---|---|
| `remove-workspace-keeps-windows` | `workspaces.rs` | workspaces (spike) | `remove_workspace` stops removing the destroyed workspace's windows from the window arena | 3: `open`, `new_ws`, `remove_ws(0)` | `check_invariants`: "window in one pane" |
| `close-pane-keeps-stale-focus` | `windows.rs` | panes (spike) | `close_pane` no longer points the workspace focus at the surviving pane | 2: `split`, `close_pane` | `check_invariants`: "focused pane is in the active workspace" |
| `remove-output-drops-workspace` | `outputs.rs` | outputs | `remove_output` migrates all but the first workspace of the removed output to the survivor | 2: `add_output`, `remove_output(0)` | `check_invariants`: "workspace ... owned by an output" (model workspace count also differs) |
| `close-window-keeps-fullscreen` | `windows.rs` | fullscreen | `close_window` no longer clears the workspace's fullscreen when the fullscreen window closes | 3: `open`, `toggle_fullscreen`, `close(0)` | `check_invariants`: "fullscreen window lives on its workspace" (model fullscreen-is-live check also differs) |
| `swap-windows-duplicates` | `windows.rs` | mark/swap | `swap_windows` puts the second window back into its own pane instead of the first window's, duplicating it and losing the other | 4: `open`, `split`, `open`, `swap_windows(0, 1)` | `check_invariants`: "window in one pane" |
| `move-window-to-workspace-noop` | `workspaces.rs` | window moves | `move_window_to_workspace` re-pushes the window onto its source pane instead of the target workspace's focused pane (the result is structurally valid) | 3: `open`, `new_ws`, `move_to_ws(0, 1)` | rule post-condition: "moved window is on the target workspace" (`check_invariants` cannot see it) |

Notes on the minima.

- Window and workspace choices are indices into the live list (modulo its length), so `remove_ws(0)` is the first workspace in output order and `move_to_ws(0, 1)` is window 0 to workspace 1.
- `swap_windows` needs two windows in different panes: two `open` plus one verb that makes a second pane or workspace (`split` or `new_ws`), then the swap. Four steps is the floor; five steps are needed through `swap_marked_window` (mark, move on, then swap).
- `move-window-to-workspace-noop` is the one mutant that `check_invariants` cannot see; it exercises the model's own post-condition. Its inclusion is deliberate (it separates the model from the target's self-check).
