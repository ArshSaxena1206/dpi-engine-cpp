## Post-Refactor Testing Checklist — Packet Analyzer

---

### PHASE 1 — Backend Sanity Check

Start backend and verify no regressions:

cd backend
npm run dev

□ Server starts without errors
□ Console shows:
info: DPI Engine backend running on http://localhost:3001
info: Swagger docs available at http://localhost:3001/api/docs
info: WebSocket server attached on port 3001
□ Redis connection established (no Bull queue errors)
□ SQLite database loads (dpi_engine.db exists)
□ logs/ folder receives new log entries

---

### PHASE 2 — API Endpoint Tests

Open http://localhost:3001/api/docs and test each endpoint:

RULES
□ GET /api/v1/rules → { success: true, data: [] }
□ POST /api/v1/rules → Create rule type "app", value "youtube", enabled true
□ POST /api/v1/rules → Create rule type "domain", value "ads.google.com", enabled true
□ POST /api/v1/rules → Create rule type "ip", value "192.168.1.1", enabled false
□ GET /api/v1/rules → Returns all 3 rules with correct ids
□ PUT /api/v1/rules/:id → Toggle enabled on first rule
□ DELETE /api/v1/rules/:id → Delete last rule
□ GET /api/v1/rules → Returns 2 rules after delete

VALIDATION (should return 400)
□ POST /api/v1/rules with type "invalid" → 400 error with field details
□ POST /api/v1/rules with empty value "" → 400 error with field details
□ POST /api/v1/rules with missing enabled → 400 error with field details

STATS
□ GET /api/v1/stats → { success: true, data: { metrics, apps, domains } }
□ GET /api/v1/stats/history → { success: true, data: [] } (empty until PCAP processed)
□ GET /api/v1/stats/history?limit=5 → Returns max 5 records

UPLOAD
□ POST /api/v1/upload with valid .pcap file → HTTP 202 + { jobId }
□ POST /api/v1/upload with .txt file → 400 error (wrong file type)
□ POST /api/v1/upload with no file → 400 error (missing file)

RATE LIMITING
□ POST /api/v1/upload 21 times rapidly → 21st request returns 429

---

### PHASE 3 — WebSocket Event Tests

Open browser console on http://localhost:5173 and run:

□ TopNav shows green "Live" dot on page load
□ Open browser console → no WebSocket connection errors
□ Wait 2 seconds → console shows stats:update event firing
□ Upload a .pcap file → job:progress events fire with increasing %
□ Upload completes → job:done event fires with outputFile path
□ Stop backend (Ctrl+C) → TopNav shows red "Disconnected" dot
□ Restart backend → TopNav returns to green "Live" dot
□ With backend stopped → stats still update every 5s (fallback polling)

---

### PHASE 4 — Frontend Component Tests

Open http://localhost:5173 and test each page:

TOPNAV
□ Connection status indicator visible (green dot)
□ Search bar renders
□ No console errors on load

DASHBOARD
□ Metric cards render (totalPackets, forwarded, dropped, activeFlows)
□ All values start at 0 (no PCAP processed yet)
□ Time range selector visible (5min / 15min / 1hr)
□ Clicking time range calls /api/v1/stats/history
□ AreaChart renders without errors
□ CSV Export button visible
□ CSV Export downloads a valid .csv file

UPLOAD
□ Drag and drop zone renders
□ File picker works (click to browse)
□ Only .pcap and .pcapng files accepted
□ Upload button triggers POST /api/v1/upload
□ Progress bar appears after upload starts
□ Progress bar animates smoothly (spring animation)
□ Stage text updates below progress bar
□ Toast notification appears on job:done
□ Download button appears after job:done
□ Forwarded/Dropped/Total summary shows after job:done

RULES
□ Rules list loads from /api/v1/rules
□ Create new rule with type selector (app/domain/ip)
□ Toggle enable/disable works
□ Delete rule works
□ Export button downloads rules.json
□ Import button accepts rules.json and creates rules
□ Drag and drop reordering works

LOGS
□ Table renders with correct columns
□ Click column header → sorts ascending
□ Click again → sorts descending
□ Search bar filters results in real-time
□ Pagination shows 20 rows per page
□ Next/Previous page buttons work
□ Click a row → detail drawer opens
□ Detail drawer shows packet metadata
□ Close drawer works

---

### PHASE 5 — Refactored Code Tests

Verify the refactored files work correctly:

BACKEND JOBS (backend/jobs/packetJob.js)
□ Import createPacketJob in server.js without errors
□ Upload a PCAP → job is created and queued in Bull
□ Job completes → output file appears in backend/output/
□ handleOutput() correctly parses engine stdout
□ generateReport() returns correct stats shape

UPLOAD SERVICE (frontend/src/services/uploadService.ts)
□ uploadPcap() called on form submit
□ Returns jobId correctly
□ downloadResult() generates correct download URL
□ No TypeScript errors (run: npm run build)

C++ REFACTOR (if applicable)
□ CMake build succeeds: cmake --build build
□ dpi_engine.exe runs without errors
□ parseArgs() correctly handles all CLI flags
□ initEngine() initializes DPIEngine correctly
□ runPipeline() processes a test PCAP successfully
□ appTypeToString() in new location still works
□ All existing blocking rules still apply correctly

---

### PHASE 6 — Documentation Check

□ Upload.tsx has data flow comment block at top
□ server.js upload route has architecture comment
□ Rules.tsx has full JSDoc documentation
□ BlockingRules struct has Doxygen comment block
□ README has "Data Flow" section
□ README has "Architecture" section
□ appTypeToString() has cross-community bridge comment
□ generateReport() has cross-community bridge comment

---

### PHASE 7 — Final Integration Test

End-to-end test with a real PCAP file:

□ Start Redis (docker start redis)
□ Start backend (cd backend; npm run dev)
□ Start frontend (cd frontend; npm run dev)
□ Open http://localhost:5173
□ Navigate to Rules → Add a domain rule (e.g. "youtube.com")
□ Navigate to Upload → Upload a real .pcap file
□ Watch progress bar animate to 100%
□ Receive job:done toast
□ Download filtered_output.pcap
□ Navigate to Dashboard → Stats show non-zero values
□ Navigate to Logs → Detected domains/SNIs appear in table
□ Export rules as JSON → reimport them → rules restored correctly
□ Check logs/server.log → all operations logged correctly
□ Check dpi_engine.db → rules and stats_history tables populated

---

### ✅ Sign-off Criteria

All boxes checked = refactor is stable and production-ready.

If any Phase 2-5 test fails:

1. Check logs/server.log for backend errors
2. Check browser console for frontend errors
3. Check Redis is running (docker ps)
4. Check dpi_engine.db is not corrupted (delete and restart to recreate)
