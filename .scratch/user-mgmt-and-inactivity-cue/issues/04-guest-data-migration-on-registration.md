# 04 — Guest Data Migration on Registration

**What to build:** Seamless data migration for typists transitioning from guest mode to an authenticated account. When a guest with locally saved test runs or custom passages completes registration at `/app/signup`, the application automatically posts their guest data to the sync endpoint under the newly created account. Once the server confirms receipt, local guest storage is emptied so that historical runs are not duplicated or orphaned.

**Blocked by:** 03 — User Registration Flow at Signup

**Status:** completed

- [x] When registration completes successfully, any local guest test runs and custom passages are sent to the synchronization endpoint.
- [x] After successful synchronization, the local storage guest data is cleared.
- [x] Newly registered typists who had guest test runs see those test runs appear in their history at `/app/history`.
- [x] Newly registered typists who created custom passages see those passages available in `/app/passages`.
- [x] If the user registers with no prior guest data, registration completes immediately without unnecessary sync delays.
