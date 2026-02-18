#!/usr/bin/env python3
"""Generate optimal 30-day reading plans for the Qur'an and Psalms.

Uses dynamic programming to partition chapters into sessions that minimize the
variance of daily verse counts, subject to constraints:

  QUR'AN:  114 surahs read in order; no surah is split across sessions.
  PSALMS:  150 psalms read in order; no psalm is split (except Psalm 119,
           which may be split at stanza boundaries — multiples of 8 verses —
           and any session containing Psalm 119 must be exclusively Psalm 119).

Both plans support once-daily (30 sessions) or morning-and-evening (60 sessions)
modes.

Usage examples:
    python reading_plan.py                          # Qur'an, once daily
    python reading_plan.py --morning-evening        # Qur'an, morning + evening
    python reading_plan.py --psalms                 # Psalms, once daily
    python reading_plan.py --psalms --morning-evening
    python reading_plan.py --all                    # Both plans
    python reading_plan.py --all --morning-evening
"""

import argparse
import csv
import os
import numpy as np


# =============================================================================
# DATA
# =============================================================================

# Standard verse counts per surah (1-114), sourced from:
#   https://en.wikipedia.org/wiki/List_of_chapters_in_the_Quran
QURAN_VERSES = np.array([
    7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128,
    111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73,
    54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60,
    49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52,
    44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19,
    26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3,
    6, 3, 5, 4, 5, 6
], dtype=np.float64)

DAYS = 30  # Days of Ramadan


def load_psalm_verses(csv_path):
    """Load verse counts per psalm from the BSB (Berean Study Bible) CSV.

    The CSV is pipe-separated with a 'verse|text' header. Verse references for
    psalms look like 'Psalm 23:1', 'Psalm 119:176', etc. We count how many
    verse lines exist for each psalm number.

    Returns
    -------
    np.ndarray of shape (150,) with the verse count for each Psalm 1-150.
    """
    counts = {}
    with open(csv_path, "r") as f:
        reader = csv.reader(f, delimiter="|")
        next(reader)  # skip header row ("verse|text")
        for row in reader:
            ref = row[0]
            if ref.startswith("Psalm "):
                psalm_num = int(ref.split()[1].split(":")[0])
                counts[psalm_num] = counts.get(psalm_num, 0) + 1

    max_psalm = max(counts.keys())
    return np.array(
        [counts.get(i, 0) for i in range(1, max_psalm + 1)], dtype=np.float64
    )


# =============================================================================
# CORE DYNAMIC PROGRAMMING — LINEAR PARTITIONING
# =============================================================================
#
# The central algorithmic problem in both plans is:
#
#   Given N items with known sizes, partition them into G contiguous groups
#   to minimize the sum of squared deviations from a target group size.
#
# This is a classic "linear partition" problem, solved exactly by DP.
#
# BACKGROUND ON DYNAMIC PROGRAMMING
# ----------------------------------
# DP solves optimization problems by decomposing them into overlapping
# subproblems, solving each subproblem once, and storing the results in a
# table so they can be reused. For introductions, see:
#
#   - https://en.wikipedia.org/wiki/Dynamic_programming
#   - https://www.geeksforgeeks.org/dynamic-programming/
#   - Cormen et al., "Introduction to Algorithms", Chapter 15
#
# LINEAR PARTITION PROBLEM
# ------------------------
# Given items with sizes  s[0], s[1], ..., s[N-1]  and G groups, find break
# points  b[0] < b[1] < ... < b[G-2]  so that:
#
#     Group 0:   items 0      .. b[0]
#     Group 1:   items b[0]+1 .. b[1]
#       ...
#     Group G-1: items b[G-2]+1 .. N-1
#
# minimizes  sum_g ( group_sum_g  -  target )^2.
#
# For more on this specific variant, see:
#   - Skiena, "The Algorithm Design Manual", Section 8.5 "The Partition Problem"
#
# DP FORMULATION
# --------------
# Let  cum[i] = s[0] + s[1] + ... + s[i]  (prefix sums, for O(1) range sums).
#
# Define:
#   dp[d][s] = minimum total cost of partitioning items 0..s into (d+1) groups
#
# Base case (d = 0, one group holding items 0..s):
#   dp[0][s] = ( cum[s] - target )^2
#
# Transition (d >= 1):
#   dp[d][s] = min over t in [d-1 .. s-1] of:
#       dp[d-1][t]  +  ( cum[s] - cum[t] - target )^2
#                        ^^^^^^^^^^^^^^^^
#                        sum of items t+1..s  (the new group d)
#
#   The constraint  t >= d-1  ensures the first d groups have at least d items.
#   The constraint  t < s     ensures group d has at least one item.
#
# Answer: dp[G-1][N-1]  (G groups covering all N items).
#
# BACKTRACKING
# ------------
# We store  choice[d][s] = optimal t  for each state, then trace back from
# (G-1, N-1) to recover the actual break points.
#
# COMPLEXITY
# ----------
# Time:  O(G * N^2)  — G groups, N endpoints, up to N split points each.
# Space: O(G * N)    — for the dp and choice tables.
#
# For our problem sizes (N <= 118, G <= 60), this runs in well under a second.
# =============================================================================


def partition_dp(sizes, num_groups, target):
    """Partition items into contiguous groups minimizing squared deviation.

    Parameters
    ----------
    sizes : np.ndarray
        Array of item sizes (e.g., verse counts per chapter).
    num_groups : int
        Number of contiguous groups (G) to form.
    target : float
        Ideal sum for each group. Typically total / num_groups, but passed
        explicitly so all sub-problems in the Psalms plan share a single
        global target.

    Returns
    -------
    breaks : list[int] or None
        0-based index of the last item in each group except the last.
        Length = num_groups - 1.  None if the partition is impossible.
    cost : float
        Minimized sum of (group_sum - target)^2.
    """
    n = len(sizes)
    g = num_groups

    # Can't form more groups than items.
    if g > n:
        return None, float("inf")

    # --- PREFIX SUMS ---
    # cum[i] = sizes[0] + sizes[1] + ... + sizes[i]
    # This lets us compute sum(sizes[a..b]) = cum[b] - cum[a-1] in O(1).
    # See: https://en.wikipedia.org/wiki/Prefix_sum
    cum = np.cumsum(sizes)

    INF = 1e18  # Sentinel for unreachable / impossible states

    # dp[d][s] = min cost of partitioning items 0..s into (d+1) groups
    dp = np.full((g, n), INF)

    # choice[d][s] = the split point t that achieved dp[d][s]
    # (used for backtracking to recover the actual partition)
    choice = np.full((g, n), -1, dtype=np.int32)

    # ---- BASE CASE (d = 0): one group containing items 0..s ----
    # The cost is simply how far the sum of 0..s deviates from the target.
    for s in range(n):
        dp[0][s] = (cum[s] - target) ** 2

    # ---- TRANSITION (d >= 1): add one more group ----
    # For each group count d and each possible last item s of that group,
    # we try every valid split point t. Items 0..t go into the first d groups
    # (cost = dp[d-1][t]), and items t+1..s form the new group d.
    #
    # The inner loop over t is vectorized with NumPy for performance:
    # instead of a Python loop, we evaluate all candidate t values at once.
    for d in range(1, g):
        for s in range(d, n):
            # Valid split points: t must be >= d-1 (so the first d groups
            # have at least one item each) and < s (so group d is non-empty).
            t_vals = np.arange(d - 1, s)

            # Sum of items in the new group d = cum[s] - cum[t]
            group_sums = cum[s] - cum[t_vals]

            # Total cost = cost of first d groups + cost of new group d
            costs = dp[d - 1, t_vals] + (group_sums - target) ** 2

            # Pick the split point with minimum cost
            best_idx = np.argmin(costs)
            dp[d][s] = costs[best_idx]
            choice[d][s] = t_vals[best_idx]

    # ---- BACKTRACKING ----
    # Trace through the choice table from (G-1, N-1) back to (1, ...)
    # to recover where each group boundary falls.
    #
    # Starting from the end: the last group ends at item N-1.
    # choice[G-1][N-1] tells us where the second-to-last group ends.
    # choice[G-2][that value] tells us the next boundary, and so on.
    breaks = []
    s = n - 1
    for d in range(g - 1, 0, -1):
        t = int(choice[d][s])
        breaks.append(t)
        s = t
    breaks.reverse()  # we collected them back-to-front

    return breaks, dp[g - 1][n - 1]


# =============================================================================
# QUR'AN READING PLAN
# =============================================================================


def quran_plan(morning_evening=False):
    """Generate and display an optimal Qur'an reading plan.

    Partitions 114 surahs into 30 (or 60) contiguous sessions, each containing
    one or more complete surahs read in canonical order. Minimizes variance of
    verse counts across sessions.

    In morning/evening mode, sessions are paired: odd-numbered sessions become
    mornings, even-numbered become evenings.
    """
    num_sessions = DAYS * 2 if morning_evening else DAYS
    total = int(QURAN_VERSES.sum())
    target = total / num_sessions

    print(f"Total Qur'an verses: {total}")
    print(f"Sessions: {num_sessions} ({'morning + evening' if morning_evening else 'once daily'})")
    print(f"Target per session: {target:.1f}")
    print("Solving via dynamic programming...")

    breaks, cost = partition_dp(QURAN_VERSES, num_sessions, target)
    print(f"  Optimal cost (sum of squared deviations): {cost:.1f}\n")

    # Compute verse count for each session using prefix sums.
    cum = np.cumsum(QURAN_VERSES)

    mode_str = "Morning & Evening" if morning_evening else "Once Daily"
    w = 85 if morning_evening else 55
    print(f"{'=' * w}")
    print(f"  RAMADAN QUR'AN READING PLAN — {mode_str} ({DAYS} days)")
    print(f"{'=' * w}")

    if morning_evening:
        print(f"  {'Day':<5} {'Morning':<22} {'Vs':<7} {'Evening':<22} {'Vs':<7} {'Total'}")
        print(f"  {'-' * (w - 2)}")
    else:
        print(f"  {'Day':<5} {'Surahs':<28} {'Verses':<8} {'vs Target'}")
        print(f"  {'-' * (w - 2)}")

    # Build the list of sessions with surah ranges and verse counts.
    prev = -1
    morning_label = ""
    morning_vs = 0
    daily_totals = []

    for session in range(num_sessions):
        last = int(breaks[session]) if session < num_sessions - 1 else len(QURAN_VERSES) - 1
        first_surah = prev + 2  # convert 0-based index to 1-based surah number
        last_surah = last + 1
        label = (
            f"Surah {first_surah}"
            if first_surah == last_surah
            else f"Surah {first_surah}-{last_surah}"
        )
        verse_count = int(cum[last] - (cum[prev] if prev >= 0 else 0))

        if morning_evening:
            day = session // 2
            if session % 2 == 0:
                morning_label = label
                morning_vs = verse_count
            else:
                total_day = morning_vs + verse_count
                daily_totals.append(total_day)
                print(
                    f"  {day + 1:<5} {morning_label:<22} {morning_vs:<7} "
                    f"{label:<22} {verse_count:<7} {total_day}"
                )
        else:
            daily_totals.append(verse_count)
            diff = verse_count - target
            sign = "+" if diff >= 0 else ""
            print(f"  {session + 1:<5} {label:<28} {verse_count:<8} {sign}{diff:.0f}")

        prev = last

    print(f"  {'-' * (w - 2)}")
    daily_arr = np.array(daily_totals)
    unit = "day" if morning_evening else "session"
    unit_target = total / DAYS if morning_evening else target
    print(f"  Total: {total} verses")
    print(f"  Target per {unit}: {unit_target:.1f}")
    print(f"  Actual range: {int(daily_arr.min())}-{int(daily_arr.max())} verses/{unit}")


# =============================================================================
# PSALMS READING PLAN
# =============================================================================
#
# The Psalms plan is more complex than the Qur'an plan because of the special
# rules around Psalm 119:
#
#   1. Most psalms are INDIVISIBLE — each must be read in a single session.
#   2. Psalm 119 (176 verses) MAY be split, but only at stanza boundaries.
#      It has 22 stanzas of 8 verses each (one per Hebrew letter, aleph-tav).
#      So valid splits are at multiples of 8 verses: 8, 16, 24, ..., 176.
#   3. Any session containing Psalm 119 must be EXCLUSIVELY Psalm 119 —
#      no other psalms may appear in that session.
#
# ALGORITHM
# ---------
# Because Psalm 119 sessions must be isolated and contiguous (they sit between
# sessions for Psalms 1-118 and sessions for Psalms 120-150), the problem
# decomposes into three independent sub-problems:
#
#   PRE-119:   Partition Psalms 1-118 into P sessions  (standard linear partition)
#   PSALM 119: Distribute 22 octets into K sessions    (trivial equal distribution)
#   POST-119:  Partition Psalms 120-150 into Q sessions (standard linear partition)
#
# where  P + K + Q = total_sessions  (30 or 60).
#
# We precompute the DP cost for every valid P (for Psalms 1-118) and every
# valid Q (for Psalms 120-150), then search over all valid (K, P) combinations
# to find the global optimum.
#
# PSALM 119 DISTRIBUTION
# ----------------------
# Since all 22 octets have the same size (8 verses), distributing them into
# K sessions as evenly as possible is trivial:
#   - (22 mod K) sessions get  ceil(22/K) octets  = ceil(22/K) * 8 verses
#   - (K - 22 mod K) sessions get  floor(22/K) octets  = floor(22/K) * 8 verses
#
# No DP is needed for this sub-problem.
# =============================================================================


def psalms_plan(morning_evening=False, csv_path=None):
    """Generate and display an optimal 30-day Psalms reading plan.

    Reads psalm verse counts from the BSB CSV, then uses the three-part
    decomposition described above to find the optimal partition.
    """
    if csv_path is None:
        csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bsb.csv")

    psalm_verses = load_psalm_verses(csv_path)
    num_psalms = len(psalm_verses)
    total_verses = int(psalm_verses.sum())
    num_sessions = DAYS * 2 if morning_evening else DAYS
    target = total_verses / num_sessions

    print(f"Total Psalm verses: {total_verses} across {num_psalms} psalms")
    print(f"Sessions: {num_sessions} ({'morning + evening' if morning_evening else 'once daily'})")
    print(f"Target per session: {target:.1f}")
    print(f"Psalm 119: {int(psalm_verses[118])} verses (22 stanzas x 8 verses)")
    print("Solving via dynamic programming with Psalm 119 isolation...")

    # ---------- SEPARATE THE THREE SECTIONS ----------
    pre_119 = psalm_verses[:118]  # Psalms 1-118 (0-indexed: 0..117)
    post_119 = psalm_verses[119:]  # Psalms 120-150 (0-indexed: 119..149)
    num_octets = 22  # 176 verses / 8 verses per stanza

    # ---------- PRECOMPUTE DP COSTS ----------
    # Rather than calling partition_dp inside a nested loop over (K, P), we
    # precompute the cost of partitioning pre-119 psalms into every valid
    # number of groups P, and similarly for post-119 with every valid Q.
    # This reduces the search to simple table lookups.

    max_p = min(len(pre_119), num_sessions - 2)  # need at least K>=1, Q>=1
    pre_cache = {}  # {P: (breaks, cost)}
    for p in range(1, max_p + 1):
        brk, cst = partition_dp(pre_119, p, target)
        if brk is not None:
            pre_cache[p] = (brk, cst)

    max_q = min(len(post_119), num_sessions - 2)
    post_cache = {}  # {Q: (breaks, cost)}
    for q in range(1, max_q + 1):
        brk, cst = partition_dp(post_119, q, target)
        if brk is not None:
            post_cache[q] = (brk, cst)

    # ---------- SEARCH OVER (K, P) COMBINATIONS ----------
    # K = sessions for Psalm 119 (1..22)
    # P = sessions for Psalms 1-118
    # Q = num_sessions - K - P = sessions for Psalms 120-150
    best_cost = float("inf")
    best_k = best_p = 0
    best_pre_breaks = best_post_breaks = None

    for k in range(1, num_octets + 1):
        # Compute cost of distributing 22 octets across k sessions.
        # Since all octets are equal (8 verses each), the optimal distribution
        # is as uniform as possible: some sessions get one extra octet.
        base = num_octets // k  # floor(22/k) octets per session
        extra = num_octets % k  # this many sessions get one extra octet
        #   extra sessions:      (base+1)*8 verses each
        #   (k-extra) sessions:  base*8 verses each
        cost_119 = extra * (8 * (base + 1) - target) ** 2 + (k - extra) * (
            8 * base - target
        ) ** 2

        remaining = num_sessions - k
        for p in range(1, remaining):
            q = remaining - p
            if p not in pre_cache or q not in post_cache:
                continue

            total_cost = pre_cache[p][1] + cost_119 + post_cache[q][1]
            if total_cost < best_cost:
                best_cost = total_cost
                best_k = k
                best_p = p
                best_pre_breaks = pre_cache[p][0]
                best_post_breaks = post_cache[q][0]

    best_q = num_sessions - best_k - best_p
    print(
        f"  Optimal split: P={best_p} (Ps 1-118), "
        f"K={best_k} (Ps 119), Q={best_q} (Ps 120-150)"
    )
    print(f"  Optimal cost: {best_cost:.1f}\n")

    # ---------- BUILD SESSION LIST ----------
    # Each session is a (label, verse_count) tuple, ordered sequentially.
    sessions = []

    # -- Pre-119 sessions (Psalms 1-118) --
    prev = -1
    for i in range(best_p):
        last = int(best_pre_breaks[i]) if i < best_p - 1 else 117
        first_psalm = prev + 2  # 1-based psalm number
        last_psalm = last + 1
        verse_count = int(pre_119[prev + 1 : last + 1].sum())
        label = (
            f"Psalm {first_psalm}"
            if first_psalm == last_psalm
            else f"Psalms {first_psalm}-{last_psalm}"
        )
        sessions.append((label, verse_count))
        prev = last

    # -- Psalm 119 sessions --
    # Distribute 22 octets across best_k sessions as evenly as possible.
    base = num_octets // best_k
    extra = num_octets % best_k
    verse_offset = 1
    for i in range(best_k):
        # First 'extra' sessions get one additional octet.
        n_octets = base + (1 if i < extra else 0)
        n_verses = n_octets * 8
        end_verse = verse_offset + n_verses - 1
        if verse_offset == 1 and end_verse == 176:
            label = "Psalm 119"
        else:
            label = f"Psalm 119:{verse_offset}-{end_verse}"
        sessions.append((label, n_verses))
        verse_offset = end_verse + 1

    # -- Post-119 sessions (Psalms 120-150) --
    prev = -1
    for i in range(best_q):
        last = (
            int(best_post_breaks[i])
            if i < best_q - 1
            else len(post_119) - 1
        )
        first_psalm = prev + 2 + 119  # offset to real psalm numbers
        last_psalm = last + 1 + 119
        verse_count = int(post_119[prev + 1 : last + 1].sum())
        label = (
            f"Psalm {first_psalm}"
            if first_psalm == last_psalm
            else f"Psalms {first_psalm}-{last_psalm}"
        )
        sessions.append((label, verse_count))
        prev = last

    # ---------- DISPLAY ----------
    mode_str = "Morning & Evening" if morning_evening else "Once Daily"
    w = 90 if morning_evening else 60
    print(f"{'=' * w}")
    print(f"  PSALMS READING PLAN — {mode_str} ({DAYS} days)")
    print(f"{'=' * w}")

    daily_totals = []

    if morning_evening:
        print(
            f"  {'Day':<5} {'Morning':<28} {'Vs':<7} {'Evening':<28} {'Vs':<7} {'Total'}"
        )
        print(f"  {'-' * (w - 2)}")
        for day in range(DAYS):
            m_label, m_vs = sessions[day * 2]
            e_label, e_vs = sessions[day * 2 + 1]
            total_day = m_vs + e_vs
            daily_totals.append(total_day)
            print(
                f"  {day + 1:<5} {m_label:<28} {m_vs:<7} "
                f"{e_label:<28} {e_vs:<7} {total_day}"
            )
    else:
        print(f"  {'Day':<5} {'Psalms':<32} {'Verses':<8} {'vs Target'}")
        print(f"  {'-' * (w - 2)}")
        for day in range(DAYS):
            label, vs = sessions[day]
            daily_totals.append(vs)
            diff = vs - target
            sign = "+" if diff >= 0 else ""
            print(f"  {day + 1:<5} {label:<32} {vs:<8} {sign}{diff:.0f}")

    print(f"  {'-' * (w - 2)}")
    daily_arr = np.array(daily_totals)
    unit = "day" if morning_evening else "session"
    unit_target = total_verses / DAYS if morning_evening else target
    print(f"  Total: {total_verses} verses")
    print(f"  Target per {unit}: {unit_target:.1f}")
    print(
        f"  Actual range: {int(daily_arr.min())}-{int(daily_arr.max())} verses/{unit}"
    )


# =============================================================================
# BOOK OF COMMON PRAYER PSALMS PLAN (from external CSV)
# =============================================================================


def bcp_psalms_plan(bcp_csv_path, bsb_csv_path=None):
    """Display the Book of Common Prayer 30-day Psalms plan.

    Reads the BCP schedule from a CSV (day,morning,evening) and resolves
    verse counts from the BSB Bible data, then displays in the same format
    as the DP-optimised plan for easy comparison.

    The BCP CSV supports these formats in the morning/evening columns:
      - Single psalm:    "68"
      - Psalm range:     "1-5"
      - Psalm 119 slice: "119:1-32"
    """
    if bsb_csv_path is None:
        bsb_csv_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "bsb.csv"
        )

    psalm_verses = load_psalm_verses(bsb_csv_path)

    def resolve_verses(spec):
        """Resolve a BCP session spec to (label, verse_count)."""
        spec = spec.strip()
        if spec.startswith("119:"):
            # Psalm 119 slice, e.g. "119:1-32"
            parts = spec.split(":")[1].split("-")
            start, end = int(parts[0]), int(parts[1])
            verse_count = end - start + 1
            label = f"Psalm {spec}"
            return label, verse_count
        elif "-" in spec:
            # Psalm range, e.g. "1-5"
            parts = spec.split("-")
            a, b = int(parts[0]), int(parts[1])
            verse_count = int(psalm_verses[a - 1 : b].sum())
            label = f"Psalm {a}" if a == b else f"Psalms {a}-{b}"
            return label, verse_count
        else:
            # Single psalm, e.g. "68"
            n = int(spec)
            return f"Psalm {n}", int(psalm_verses[n - 1])

    # Read the BCP CSV
    days = []
    with open(bcp_csv_path, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            m_label, m_vs = resolve_verses(row["morning"])
            e_label, e_vs = resolve_verses(row["evening"])
            days.append((int(row["day"]), m_label, m_vs, e_label, e_vs))

    total_verses = sum(m + e for _, _, m, _, e in days)
    target = total_verses / len(days)

    print(f"Total Psalm verses: {total_verses} across {len(days)} days")
    print(f"Target per day: {target:.1f}\n")

    w = 90
    print(f"{'=' * w}")
    print(f"  PSALMS READING PLAN — Book of Common Prayer ({len(days)} days)")
    print(f"{'=' * w}")
    print(
        f"  {'Day':<5} {'Morning':<28} {'Vs':<7} {'Evening':<28} {'Vs':<7} {'Total'}"
    )
    print(f"  {'-' * (w - 2)}")

    daily_totals = []
    for day, m_label, m_vs, e_label, e_vs in days:
        total_day = m_vs + e_vs
        daily_totals.append(total_day)
        print(
            f"  {day:<5} {m_label:<28} {m_vs:<7} "
            f"{e_label:<28} {e_vs:<7} {total_day}"
        )

    print(f"  {'-' * (w - 2)}")
    daily_arr = np.array(daily_totals)
    print(f"  Total: {total_verses} verses")
    print(f"  Target per day: {target:.1f}")
    print(f"  Actual range: {int(daily_arr.min())}-{int(daily_arr.max())} verses/day")
    print(f"  Std dev: {daily_arr.std():.1f}")


# =============================================================================
# MAIN
# =============================================================================


def main():
    parser = argparse.ArgumentParser(
        description="Optimal 30-day reading plans for the Qur'an and Psalms.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s --quran                  Qur'an plan, once daily
  %(prog)s --quran --morning-evening  Qur'an plan, morning + evening
  %(prog)s --psalms                 Psalms plan, once daily
  %(prog)s --psalms --morning-evening  Psalms plan, morning + evening
  %(prog)s --all                    Both plans, once daily
  %(prog)s --all --morning-evening  Both plans, morning + evening
  %(prog)s --bcp                    Book of Common Prayer Psalms plan""",
    )
    plan_group = parser.add_mutually_exclusive_group(required=True)
    plan_group.add_argument(
        "--quran",
        action="store_true",
        help="Generate a Qur'an reading plan",
    )
    plan_group.add_argument(
        "--psalms",
        action="store_true",
        help="Generate a Psalms reading plan",
    )
    plan_group.add_argument(
        "--all",
        action="store_true",
        help="Generate both Qur'an and Psalms plans",
    )
    plan_group.add_argument(
        "--bcp",
        action="store_true",
        help="Display the Book of Common Prayer 30-day Psalms plan",
    )
    parser.add_argument(
        "--morning-evening",
        action="store_true",
        help="Split each day into morning and evening sessions",
    )
    args = parser.parse_args()

    if args.bcp:
        bcp_csv = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "bcp_psalms.csv"
        )
        bcp_psalms_plan(bcp_csv)
        return

    if args.quran or args.all:
        quran_plan(morning_evening=args.morning_evening)

    if args.psalms or args.all:
        if args.all:
            print("\n\n")
        psalms_plan(morning_evening=args.morning_evening)


if __name__ == "__main__":
    main()
