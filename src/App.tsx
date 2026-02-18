import type { FormEvent } from "react";
import "./App.css";
import { useChallengeData, buildProgress } from "./hooks/useChallengeData";
import { todayKey, toDate, daysBetween } from "./utils/dates";
import type { Filter } from "./types/challenge";
import { supabaseAvailable } from "./services/challengeSync";

import { ChallengeForm } from "./components/ChallengeForm";
import { FilterChips } from "./components/FilterChips";
import { ChallengeCard } from "./components/ChallengeCard";
import { TodayList } from "./components/TodayList";

function App() {
  const {
    state: {
      challenges,
      form,
      message,
      notificationsEnabled,
      filter,
      stats,
      sortedChallenges,
      filterCounts,
      session,
      userEmail,
      syncing,
      authBusy,
      conflict,
    },
    actions: {
      setForm,
      setMessage,
      setFilter,
      addChallenge,
      updateChallenge,
      removeChallenge,
      toggleToday,
      toggleReminders,
      enableNotifications,
      downloadCalendar,
      setUserEmail,
      signInWithEmail,
      signOut,
      resolveConflict,
    },
    helpers: { templates },
  } = useChallengeData();

  const today = todayKey();
  const now = new Date();

  const filteredChallenges = sortedChallenges.filter((challenge) => {
    const progress = buildProgress(challenge, now);
    const start = toDate(challenge.startDate);
    const upcoming = start > now;

    switch (filter) {
      case "today":
      case "active":
        return !upcoming && progress.status !== "completed";
      case "completed":
        return progress.status === "completed";
      case "upcoming":
        return upcoming;
      case "all":
      default:
        return true;
    }
  });

  const todayFocus = sortedChallenges
    .filter((challenge) => {
      const progress = buildProgress(challenge, now);
      const start = toDate(challenge.startDate);
      return start <= now && progress.status !== "completed";
    })
    .slice(0, 3);

  const scrollToBoard = () => {
    const el = document.getElementById("board");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addChallenge();
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Challenge Radar</p>
          <h1>Stay on top of your challenges every day.</h1>
          <p className="lede">
            Create a challenge, check in daily, get reminders, and drop the
            schedule straight into your calendar.
          </p>
          <div className="top-actions">
            <button className="primary" onClick={enableNotifications}>
              {notificationsEnabled
                ? "Notifications active"
                : "Enable reminders"}
            </button>
            <button className="ghost" type="button" onClick={scrollToBoard}>
              Go to board
            </button>
            <span className="hint">Today is {today}</span>
          </div>
          {supabaseAvailable && (
            <div className="sync-bar">
              {session ? (
                <>
                  <span className="hint">
                    Signed in {session.user.email ?? session.user.id}
                  </span>
                  <button className="ghost" onClick={signOut}>
                    Sign out
                  </button>
                  <span className="hint">{syncing ? "Syncing…" : "Synced"}</span>
                  {supabaseAvailable && !syncing && message && (
                    <span className="hint">{message}</span>
                  )}
                </>
              ) : (
                <form
                  className="sync-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (authBusy) return;
                    if (userEmail.trim()) signInWithEmail(userEmail.trim());
                  }}
                >
                  <input
                    className="sync-input"
                    type="email"
                    placeholder="email for sync"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                  <button className="primary" type="submit" disabled={authBusy}>
                    {authBusy ? "Sending..." : "Magic link"}
                  </button>
                  {message && <span className="hint">{message}</span>}
                </form>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="panel board-panel" id="board">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Your board</p>
            <h2>Stay on track daily</h2>
          </div>
          <div className="stat-pills">
            <span className="pill stat">Active {stats.active}</span>
            <span className="pill stat">Completed {stats.completed}</span>
            <span className="pill stat">Check-ins {stats.checkIns}</span>
            <span className="pill stat">Finish {stats.completionRate}%</span>
          </div>
        </div>

        {conflict && (
          <div className="conflict-banner">
            <div>
              <p className="eyebrow small">Cloud vs Local</p>
              <p className="tiny">
                We found data on this device and in the cloud. Choose how to resolve sync.
              </p>
            </div>
            <div className="chip-row">
              <button className="ghost" onClick={() => resolveConflict("remote")}>
                Use cloud
              </button>
              <button className="ghost" onClick={() => resolveConflict("local")}>
                Use this device
              </button>
              <button className="primary" onClick={() => resolveConflict("merge")}>
                Merge newest
              </button>
            </div>
          </div>
        )}

        <FilterChips
          filter={filter}
          counts={filterCounts}
          onChange={(key: Filter) => setFilter(key)}
        />

        {filteredChallenges.length === 0 ? (
          <div className="empty">
            <p>
              {challenges.length === 0
                ? "No challenges yet. Add one to start a streak."
                : "Nothing in this view. Try another filter or create a new challenge."}
            </p>
          </div>
        ) : (
          <div className="challenge-grid">
            {filteredChallenges.map((challenge) => {
              const progress = buildProgress(challenge, now);
              const start = toDate(challenge.startDate);
              const startsInDays = Math.max(
                0,
                Math.ceil(
                  (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                ),
              );
              const currentDay = Math.min(
                challenge.totalDays,
                Math.max(0, daysBetween(challenge.startDate, now) + 1),
              );
              const doneToday = !!challenge.entries[today];

              return (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  progress={progress}
                  currentDay={currentDay}
                  startsInDays={startsInDays}
                  doneToday={doneToday}
                  onToggleToday={toggleToday}
                  onToggleReminders={toggleReminders}
                  onRemove={removeChallenge}
                  onUpdate={updateChallenge}
                  onDownload={downloadCalendar}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="panel soft">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Quick check-ins</h2>
          </div>
          <p className="tiny">Mark today without hunting through the board.</p>
        </div>
        <TodayList
          challenges={todayFocus}
          today={today}
          now={now}
          onToggleToday={toggleToday}
          onDownload={downloadCalendar}
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <p className="eyebrow">New challenge</p>
            <h2>Set up a fresh streak</h2>
          </div>
          <p className="tiny">
            No backend required — everything is stored locally.
          </p>
        </div>

        <ChallengeForm
          form={form}
          setForm={setForm}
          message={message}
          setMessage={setMessage}
          onSubmit={handleSubmit}
          templates={templates}
        />
      </section>
    </div>
  );
}

export default App;
