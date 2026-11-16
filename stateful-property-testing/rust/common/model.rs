//! The shared model and oracle, included by both harness crates with `#[path]`, so the two
//! libraries drive exactly the same rules, model and checks. A `Step` is one rule application;
//! choices of windows, workspaces and outputs are indices into the live list (taken modulo its
//! length) so a generated step never carries an id the model could not predict.

use crucible_layout::{Direction, GapConfig, LayoutError, OutputId, Rect, WindowId, WorkspaceId, World};
use std::collections::BTreeSet;

/// Step cap per case, equal in both libraries (Hegel's default step count).
#[allow(dead_code)]
pub const MAX_STEPS: usize = 50;
/// Largest index a step carries.
pub const IDX_MAX: usize = 15;
pub const DIRS: [Direction; 4] = [Direction::Left, Direction::Right, Direction::Up, Direction::Down];
const OUTPUT_RECT: Rect = Rect::new(0, 0, 800, 600);

#[derive(Clone, Debug)]
pub enum Step {
    Open,
    Close(usize),
    Split(Direction),
    ClosePane,
    Focus(Direction),
    Move(Direction),
    NewWs,
    SwitchWs(usize),
    RemoveWs(usize),
    MoveToWs(usize, usize),
    AddOutput,
    RemoveOutput(usize),
    FocusOutput(usize),
    ToggleFullscreen,
    SetFullscreen(usize, bool),
    MarkWindow,
    SwapMarked,
    SwapWindows(usize, usize),
    FocusWindow(usize),
}

/// Number of distinct step kinds; both libraries pick a kind uniformly.
#[allow(dead_code)]
pub const KINDS: usize = 19;

pub struct Model {
    w: World,
    windows: BTreeSet<WindowId>,
    outputs: usize,
    workspaces: usize,
    n: u64,
}

fn pick<T: Copy>(v: &[T], k: usize) -> Option<T> {
    if v.is_empty() { None } else { Some(v[k % v.len()]) }
}

impl Model {
    pub fn new() -> Self {
        let mut w = World::new("ws0");
        let first = w.output_ids().next().expect("one output");
        w.set_output_rect(first, OUTPUT_RECT).expect("seed output");
        Model { w, windows: BTreeSet::new(), outputs: 1, workspaces: 1, n: 0 }
    }

    fn live(&self) -> Vec<WindowId> { self.windows.iter().copied().collect() }
    fn ws_ids(&self) -> Vec<WorkspaceId> { self.w.outputs().flat_map(|(_, o)| o.workspaces().to_vec()).collect() }
    fn out_ids(&self) -> Vec<OutputId> { self.w.output_ids().collect() }
    fn name(&mut self) -> String { self.n += 1; format!("ws{}", self.n) }
    fn on_workspace(&self, win: WindowId, ws: WorkspaceId) -> bool {
        self.w.workspace(ws).is_some_and(|s| s.panes().iter().any(|p| self.w.pane(*p).is_some_and(|p| p.windows().contains(&win))))
    }

    /// Applies one step to the target and checks the step's post-conditions (panics on a violation).
    pub fn apply(&mut self, step: &Step) {
        match step {
            Step::Open => {
                let id = self.w.open_window();
                assert!(self.windows.insert(id), "open_window returned a fresh id");
            }
            Step::Close(k) => {
                if let Some(id) = pick(&self.live(), *k) {
                    self.w.close_window(id).expect("close_window on a live window");
                    self.windows.remove(&id);
                    assert!(self.w.window(id).is_none(), "closed window is gone");
                }
            }
            Step::Split(d) => { self.w.split(*d); }
            Step::ClosePane => {
                if let Err(e) = self.w.close_pane() {
                    assert!(matches!(e, LayoutError::PaneNotEmpty | LayoutError::LastPane), "close_pane refusal is documented: {e:?}");
                }
            }
            Step::Focus(d) => self.w.focus(*d),
            Step::Move(d) => self.w.move_(*d),
            Step::NewWs => {
                let n = self.name();
                self.w.new_workspace(n).expect("fresh workspace name");
                self.workspaces += 1;
            }
            Step::SwitchWs(k) => {
                if let Some(id) = pick(&self.ws_ids(), *k) { self.w.switch_workspace(id).expect("switch to a live workspace"); }
            }
            Step::RemoveWs(k) => {
                if let Some(id) = pick(&self.ws_ids(), *k) {
                    match self.w.remove_workspace(id) {
                        Ok(gone) => {
                            self.workspaces -= 1;
                            for g in gone { assert!(self.windows.remove(&g), "removed window was live"); }
                        }
                        Err(e) => assert!(matches!(e, LayoutError::LastWorkspace(_)), "remove_workspace refusal is documented: {e:?}"),
                    }
                }
            }
            Step::MoveToWs(kw, ks) => {
                if let (Some(win), Some(ws)) = (pick(&self.live(), *kw), pick(&self.ws_ids(), *ks)) {
                    match self.w.move_window_to_workspace(win, ws) {
                        Ok(()) => assert!(self.on_workspace(win, ws), "moved window is on the target workspace"),
                        Err(e) => assert!(matches!(e, LayoutError::SameWorkspace), "move_window_to_workspace refusal is documented: {e:?}"),
                    }
                }
            }
            Step::AddOutput => {
                let n = self.name();
                self.w.add_output(OUTPUT_RECT, n).expect("fresh workspace name");
                self.outputs += 1;
                self.workspaces += 1;
            }
            Step::RemoveOutput(k) => {
                if let Some(id) = pick(&self.out_ids(), *k) {
                    match self.w.remove_output(id) {
                        Ok(()) => self.outputs -= 1,
                        Err(e) => assert!(matches!(e, LayoutError::LastOutput), "remove_output refusal is documented: {e:?}"),
                    }
                }
            }
            Step::FocusOutput(k) => {
                if let Some(id) = pick(&self.out_ids(), *k) { self.w.set_focused_output(id).expect("live output"); }
            }
            Step::ToggleFullscreen => {
                if let Some(win) = self.w.focused_window() {
                    let was = self.w.is_fullscreen(win);
                    self.w.toggle_fullscreen();
                    assert_eq!(self.w.is_fullscreen(win), !was, "toggle_fullscreen flips the focused window");
                }
            }
            Step::SetFullscreen(k, on) => {
                if let Some(win) = pick(&self.live(), *k) {
                    self.w.set_fullscreen(win, *on).expect("set_fullscreen on a live window");
                    assert_eq!(self.w.is_fullscreen(win), *on, "set_fullscreen took effect");
                }
            }
            Step::MarkWindow => self.w.mark_window(),
            Step::SwapMarked => self.w.swap_marked_window(),
            Step::SwapWindows(ka, kb) => {
                let live = self.live();
                if let (Some(a), Some(b)) = (pick(&live, *ka), pick(&live, *kb)) {
                    if let Err(e) = self.w.swap_windows(a, b) {
                        assert!(matches!(e, LayoutError::SamePane), "swap_windows refusal is documented: {e:?}");
                    }
                }
            }
            Step::FocusWindow(k) => {
                if let Some(id) = pick(&self.live(), *k) { self.w.focus_window(id).expect("focus a live window"); }
            }
        }
    }

    /// The oracle, run after every step: the target's `check_invariants`, then counts and
    /// liveness against the model, then tiled geometry.
    pub fn check(&self) {
        self.w.check_invariants();
        assert_eq!(self.w.window_count(), self.windows.len(), "window count");
        assert_eq!(self.w.output_count(), self.outputs, "output count");
        assert_eq!(self.ws_ids().len(), self.workspaces, "workspace count");
        for v in self.w.visible_windows() { assert!(self.windows.contains(&v), "visible window is live"); }
        for f in self.w.fullscreen_windows() { assert!(self.windows.contains(&f), "fullscreen window is live"); }
        if let Some(m) = self.w.marked() { assert!(self.windows.contains(&m), "marked window is live"); }
        for (id, out) in self.w.outputs() {
            let r = out.rect;
            let rects: Vec<Rect> = self.w.geometry_for(id, GapConfig { outer: 0, inner: 0 }).into_iter().map(|(_, r)| r).collect();
            for t in &rects {
                assert!(t.x >= r.x && t.y >= r.y && t.x + t.width <= r.x + r.width && t.y + t.height <= r.y + r.height, "tile inside its output rect");
            }
            for (i, a) in rects.iter().enumerate() {
                for b in &rects[i + 1..] { assert!(!a.intersects(*b), "tiles do not overlap"); }
            }
        }
    }
}
