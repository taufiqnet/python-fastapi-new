# Rule: In-Place Non-Destructive Filtering & Pagination

When building, refactoring, or maintaining data tables, directories, rosters, or catalog views across all Next.js/React modules:

## 1. Never Unmount the Table or Data Container on Filter/Pagination Changes
- **Anti-Pattern (Forbidden):** `{loading ? <LargeSpinnerCard /> : <Table />}` where changing a filter or dropdown replaces the active table/grid with an empty loading card. This causes jarring layout shifts, screen flashes, and loss of scroll position.
- **Rule:** The table, table headers, column structures, filter bars, and pagination controls MUST remain mounted and fixed in place throughout all filter and page transitions.

## 2. Implement Two-Tier Loading State
Always decouple initial mount from subsequent background updates:
- **`initialLoading` (boolean):** Active ONLY on initial page load when no data exists in memory yet (`isInitialMount.current === true`). Display an initial skeleton/loader only when `initialLoading === true`.
- **`isFetching` (boolean):** Active during subsequent filter changes, searches, or pagination transitions.
- **Standard Implementation Pattern:**
  ```tsx
  const [initialLoading, setInitialLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const isInitialMount = useRef(true);

  const fetchData = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setIsFetching(true);
    }
    try {
      // API call...
    } finally {
      setInitialLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchData(true);
    } else {
      fetchData(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedDepartment, statusFilter]);
  ```

## 3. In-Place Visual Feedback Invariants
During `isFetching`, provide clear, non-disruptive visual indicators:
1. **Top Progress Bar:** Render an indeterminate progress line across the top rim of the table or card container:
   ```tsx
   {isFetching && (
     <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-100 overflow-hidden z-20">
       <div className="w-full h-full bg-indigo-600 animate-pulse" />
     </div>
   )}
   ```
2. **Smooth Row Dimming:** Apply `transition-opacity duration-150 ${isFetching ? "opacity-50 pointer-events-none" : "opacity-100"}` to `<tbody>` or grid container so users see data is refreshing without layout jumps.
3. **Inline Spinner:** Show a subtle `<Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin shrink-0" />` next to the count text (`Showing X of Y items`).
4. **Never Disable Unrelated Action Buttons:** Export, Import, and other toolbar buttons must not disable or flicker during background re-fetching.

## 4. Eliminate Cascading Double-Fetches & Use `startTransition`
- **Anti-Pattern (Forbidden):** A secondary `useEffect` that listens to filter state changes just to call `setCurrentPage(1)`. This triggers two sequential renders and two parallel network calls.
- **Rule:** Consolidate filter updates into explicit handlers wrapped in React's `startTransition`:
  ```tsx
  const handleDepartmentSelect = (deptId: string) => {
    startTransition(() => {
      setSelectedDepartment(deptId);
      setCurrentPage(1);
    });
  };
  ```
- This guarantees that filter criteria and page resets are batched into a single render turn, executing **exactly one network request** per filter interaction.
