# Ticket 2: Point and zoom the view from code

> Source spec: `plans/v4-guided-tours.md`

**What to build:** A camera director inside `SkyCanvas` that, given a target direction and a
field of view, eases the view to them over about 1.5 s (ease-in-out, shortest arc), then gives
control back to OrbitControls. Prove it with **one hard-coded target** (for example a temporary
`/?lookAt=M42` dev-only path, or a test harness). No tour UI yet.

Today the canvas has a fixed 75° FOV, `enableZoom={false}`, and no camera API. **User zoom
stays disabled.** Only code can change the FOV.

- Target FOV: about 50° for a constellation (or fit to its outline), about 15° for a star or
  Messier object, and 75° to reset.
- OrbitControls drag is disabled only while a transition is running. The next transition starts
  from wherever the user has dragged to.
- `prefers-reduced-motion`: cut instantly to the target.
- Point picking must still select the right star at 15° and 50° FOV. Check the pick threshold.
- Highlight: a ring around a star or Messier target, brightened lines for a constellation target.

The interpolation (direction and FOV against normalised time) is a pure function. Build it
test-first. Remove any dev-only entry point before merge, or gate it out of production.

**Blocked by:** None. Can start immediately.

- [ ] Pure interpolation tests: shortest-arc direction, FOV easing, endpoints exact, reduced-motion is instant.
- [ ] Per-kind target tests: the direction and FOV produced for a constellation, a star and a Messier object.
- [ ] The view moves smoothly to a target and the FOV narrows. Dragging works again once it settles.
- [ ] Clicking a star while zoomed to 15° selects that star.
- [ ] The scroll wheel still does not zoom.
- [ ] Full test suite passes; `next build` succeeds.
- [ ] **Checked on a Vercel preview deploy:** the transition holds 60 fps on a laptop.
