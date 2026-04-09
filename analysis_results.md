# SplitBuddy — Test Report & Enhancement Plan

![App Recording](file:///C:/Users/celex/.gemini/antigravity/brain/bd0fa10f-b2a4-488f-8cc9-22db2ef9d455/splitbuddy_full_test_1775745523504.webp)

## ✅ What's Working Well

| Feature | Status |
|---|---|
| Login page (Email, Google, Anonymous) | ✅ Working |
| Auth tab switching (Sign In / Sign Up) | ✅ Working |
| Form validation on login | ✅ Working |
| Anonymous sign-in + redirect to dashboard | ✅ Working |
| Dashboard empty state | ✅ Working |
| Create Group modal (email + guest adding) | ✅ Working |
| Group detail page (balances, members, settlements) | ✅ Working |
| Add Expense 3-step modal | ✅ Working |
| Edit Expense (pre-populated form) | ✅ Working |
| Balance calculation (paid - owed) | ✅ Correct |
| Settlement suggestions (greedy algorithm) | ✅ Correct |
| Navigation (← My Groups, redirect on auth) | ✅ Working |

---

## 🐛 Bugs Found

### Bug 1 — Missing `key` prop in `AddExpenseModal.jsx` (React Warning)
**File:** `src/components/AddExpenseModal.jsx` — Line 204–210  
**Issue:** The step indicator uses a React Fragment (`<>`) inside `.map()` without a `key` prop. This causes React to log warnings and can lead to subtle rendering bugs.

```jsx
// ❌ Current — Fragment in map() has no key
{[1, 2, 3].map((s, i) => (
  <>
    <div key={s} ...>{step > s ? '✓' : s}</div>
    {i < 2 && <div key={`line-${s}`} ... />}
  </>
))}

// ✅ Fix — key goes on the Fragment wrapper
{[1, 2, 3].map((s, i) => (
  <React.Fragment key={s}>
    <div className={`step-dot ...`}>{step > s ? '✓' : s}</div>
    {i < 2 && <div className="step-line ..." />}
  </React.Fragment>
))}
```

---

### Bug 2 — Expense deletion blocked by native `confirm()` dialog
**File:** `src/app/groups/[groupId]/page.jsx` — Line 61  
**File:** `src/app/dashboard/page.jsx` — Line 40  
**Issue:** Using the browser's native `confirm()` for delete confirmations is unreliable in automated testing environments and can also be blocked in certain browser setups (e.g., iframes, some Chromium flags). It also breaks UX on mobile (no native styling possible).  
**Fix:** Replace with a custom inline confirmation UI or a small modal.

---

### Bug 3 — `equalShare` variable defined but never used (dead code)
**File:** `src/components/AddExpenseModal.jsx` — Line 390  
```jsx
// ❌ Dead code — defined but never called
const equalShare = splitSelectedCount => total / splitSelectedCount;
```
This is a dead arrow function assigned to a `const` that shadows nothing and is never invoked. It should be removed.

---

### Bug 4 — `createGroup` doesn't include all `memberUids` (non-creator registered users not added)
**File:** `src/lib/groups.js` — Line 22  
**Issue:** `memberUids` is initialized as `[creatorUid]` only, and non-guest registered members added via "Add by Email" are never appended. The `CreateGroupModal` builds `memberUids` locally but `createGroup()` ignores the parameter — it always sets `memberUids: [creatorUid]`. This means other registered users searching for their groups won't find ones they've been added to.

```js
// ❌ Current — memberUids only ever contains the creator
const groupData = {
  memberUids: [creatorUid],  // never includes other real users!
  ...
}

// ✅ Fix — accept and use memberUids param
export async function createGroup(name, members, creatorUid, creatorName) {
  const memberUids = members
    .filter(m => m.uid)
    .map(m => m.uid);
  const groupData = {
    memberUids,   // all real users, including creator
    ...
  }
}
```

---

### Bug 5 — Anonymous users have no `displayName`, shown as "You" in expense payer name
**File:** `src/components/CreateGroupModal.jsx` — Line 23  
**Issue:** Anonymous users don't get a `displayName` assigned. The creator's name in Firestore is stored as `"You"` literally (the fallback from `currentUser.displayName || currentUser.email?.split('@')[0] || 'You'`). This makes group expense history confusing when another member views it — the payer shows as "You" instead of a real name.  
**Fix:** Prompt anonymous users for a display name, or at minimum use a generic label like "Guest (Creator)".

---

## 💡 Enhancement Suggestions

### Enhancement 1 — Replace `confirm()` with a custom delete modal
Native browser dialogs are unstyled and inconsistent across platforms. A small in-app "Are you sure?" card would be much more polished.

### Enhancement 2 — Add a `createdAt` date to group cards on Dashboard
Currently the cards show only member count. Showing "Created 2 days ago" gives users context.

### Enhancement 3 — Add expense category tags
The icon detection via `getExpenseIcon()` is clever but heuristic. Letting users pick a category (Food, Travel, Shopping, etc.) from a dropdown would be more reliable and visually richer.

### Enhancement 4 — Show "You owe" / "You are owed" summary on Dashboard
Right now balances are only visible inside a group. A per-group balance summary on the dashboard card (e.g., "You owe ₹300") would let users see their overall status at a glance.

### Enhancement 5 — Real-time updates with Firestore `onSnapshot`
Currently, the app fetches data with `getDocs` (one-shot reads). Using `onSnapshot` listeners would give real-time sync — if another group member adds an expense, your screen updates immediately.

### Enhancement 6 — "Settle Up" button to mark a debt as paid
Right now settlements are suggestions but there's no way to act on them. A "Mark as Settled" action per settlement would clear it from the list.

### Enhancement 7 — Add `Escape` key to close modals
Both modals support clicking the backdrop to close, but pressing `Escape` doesn't work. A `useEffect` listening for `keydown` would complete the UX.

### Enhancement 8 — Password strength indicator on Sign Up
The password field shows "At least 6 characters" as placeholder but no live validation. A simple strength meter would improve the sign-up experience.

---

## 🔧 Priority Fix Order

| Priority | Fix |
|---|---|
| 🔴 High | Bug 4 — `memberUids` not populated for non-creator users |
| 🔴 High | Bug 1 — Missing `key` prop (React warning) |
| 🟡 Medium | Bug 2 — Replace `confirm()` dialogs with custom UI |
| 🟡 Medium | Bug 5 — Anonymous user display name is "You" |
| 🟢 Low | Bug 3 — Dead code (`equalShare` unused variable) |
