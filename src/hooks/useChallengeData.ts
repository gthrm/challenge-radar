import { useEffect, useMemo, useState } from "react";
import type {
  Challenge,
  Filter,
  FormState,
  MergeConflict,
  Progress,
  Stats,
} from "../types/challenge";
import { daysBetween, formatDate, pad, todayKey, toDate } from "../utils/dates";
import { buildIcs } from "../utils/ics";
import {
  deleteChallenge,
  fetchRemoteChallenges,
  supabaseAvailable,
  upsertChallenge,
} from "../services/challengeSync";
import { supabase } from "../services/supabaseClient";

const STORAGE_KEY = "challenge-radar:v1";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const defaultTemplates: Array<{ label: string; data: Partial<FormState> }> = [
  {
    label: "30-day Photos",
    data: {
      title: "30-Day Photo Sprint",
      description: "Shoot one photo daily that captures your mood.",
      totalDays: 30,
      reminderTime: "09:00",
    },
  },
  {
    label: "21-day Move",
    data: {
      title: "21-Day Move Streak",
      description: "15-minute movement every day.",
      totalDays: 21,
      reminderTime: "07:30",
    },
  },
  {
    label: "14-day Reading",
    data: {
      title: "14-Day Reading",
      description: "Read 10 pages daily.",
      totalDays: 14,
      reminderTime: "20:30",
    },
  },
];

const initialFormState = (): FormState => ({
  title: "",
  description: "",
  startDate: todayKey(),
  totalDays: 30,
  reminderTime: "09:00",
  remindersOn: true,
});

const loadChallenges = (): Challenge[] => {
  if (typeof window === "undefined") return [];
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as Challenge[];
    } catch (error) {
      console.warn("Unable to parse cached challenges", error);
    }
  }
  return [];
};

const notificationsGranted = () =>
  typeof Notification !== "undefined" && Notification.permission === "granted";

export const useChallengeData = () => {
  const [challenges, setChallenges] = useState<Challenge[]>(loadChallenges);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [message, setMessage] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(
    notificationsGranted(),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [userEmail, setUserEmail] = useState<string>("");
  const [session, setSession] = useState<null | { user: { id: string; email?: string } }>(null);
  const [syncing, setSyncing] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [conflict, setConflict] = useState<MergeConflict | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    if (!notificationsEnabled || typeof Notification === "undefined") return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const today = formatDate(now);

      setChallenges((prev) =>
        prev.map((challenge) => {
          if (!challenge.remindersOn || challenge.reminderTime !== currentTime)
            return challenge;
          if (challenge.entries[today] || challenge.lastNotified === today)
            return challenge;

          new Notification("Challenge reminder", {
            body: `${challenge.title}: mark today as done`,
            tag: challenge.id,
          });

          return { ...challenge, lastNotified: today };
        }),
      );
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!supabaseAvailable || !supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession({
          user: { id: data.session.user.id, email: data.session.user.email ?? undefined },
        });
        pushLocalThenHydrate(data.session.user.id);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (newSession?.user) {
          setSession({
            user: { id: newSession.user.id, email: newSession.user.email ?? undefined },
          });
          pushLocalThenHydrate(newSession.user.id);
        } else {
          setSession(null);
        }
      },
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo<Stats>(() => {
    const total = challenges.length;
    const completed = challenges.filter((challenge) => {
      const { done } = buildProgress(challenge);
      return done >= challenge.totalDays;
    }).length;
    const checkIns = challenges.reduce(
      (sum, challenge) =>
        sum + Object.values(challenge.entries).filter(Boolean).length,
      0,
    );

    return {
      total,
      active: Math.max(0, total - completed),
      completed,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
      checkIns,
    };
  }, [challenges]);

  const sortedChallenges = useMemo(
    () =>
      [...challenges].sort((a, b) => {
        const aProgress = buildProgress(a);
        const bProgress = buildProgress(b);

        if (
          aProgress.status === "completed" &&
          bProgress.status !== "completed"
        )
          return 1;
        if (
          aProgress.status !== "completed" &&
          bProgress.status === "completed"
        )
          return -1;

        return toDate(a.startDate).getTime() - toDate(b.startDate).getTime();
      }),
    [challenges],
  );

  const filterCounts = useMemo(() => {
    const now = new Date();
    const base = {
      today: 0,
      active: 0,
      completed: 0,
      upcoming: 0,
      all: sortedChallenges.length,
    };
    sortedChallenges.forEach((challenge) => {
      const progress = buildProgress(challenge, now);
      const upcoming = toDate(challenge.startDate) > now;
      if (!upcoming && progress.status !== "completed") {
        base.today += 1;
        base.active += 1;
      }
      if (upcoming) base.upcoming += 1;
      if (progress.status === "completed") base.completed += 1;
    });
    return base;
  }, [sortedChallenges]);

  const addChallenge = () => {
    const trimmed = form.title.trim();
    if (!trimmed) {
      setMessage("Name your challenge first.");
      return;
    }
    const totalDays = Math.max(
      1,
      Number.isNaN(form.totalDays) ? 1 : form.totalDays,
    );

    const newChallenge: Challenge = {
      id: makeId(),
      title: trimmed,
      description: form.description.trim() || undefined,
      startDate: form.startDate,
      totalDays,
      reminderTime: form.reminderTime,
      remindersOn: form.remindersOn,
      entries: {},
      updatedAt: new Date().toISOString(),
    };

    setChallenges((prev) => [newChallenge, ...prev]);
    setForm(initialFormState());
    setMessage("Challenge added. You got this!");

    if (session) upsertChallenge(newChallenge, session.user.id);
  };

  const updateChallenge = (id: string, updates: Partial<Challenge>) => {
    setChallenges((prev) =>
      prev.map((challenge) =>
        challenge.id === id ? { ...challenge, ...updates } : challenge,
      ),
    );

    if (session) {
      const target = challenges.find((c) => c.id === id);
      if (target) upsertChallenge({ ...target, ...updates, updatedAt: new Date().toISOString() }, session.user.id);
    }
  };

  const removeChallenge = (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
    if (session) deleteChallenge(id);
  };

  const toggleToday = (id: string) => {
    const today = todayKey();
    setChallenges((prev) =>
      prev.map((challenge) => {
        if (challenge.id !== id) return challenge;
        const entries = {
          ...challenge.entries,
          [today]: !challenge.entries[today],
        };
        return { ...challenge, entries, updatedAt: new Date().toISOString() };
      }),
    );

    if (session) {
      const target = challenges.find((c) => c.id === id);
      if (target) {
        const entries = {
          ...target.entries,
          [today]: !target.entries[today],
        };
        upsertChallenge({ ...target, entries, updatedAt: new Date().toISOString() }, session.user.id);
      }
    }
  };

  const toggleReminders = (id: string) => {
    setChallenges((prev) =>
      prev.map((challenge) =>
        challenge.id === id
          ? { ...challenge, remindersOn: !challenge.remindersOn, updatedAt: new Date().toISOString() }
          : challenge,
      ),
    );

    if (session) {
      const target = challenges.find((c) => c.id === id);
      if (target) {
        upsertChallenge({
          ...target,
          remindersOn: !target.remindersOn,
          updatedAt: new Date().toISOString(),
        }, session.user.id);
      }
    }
  };

  const enableNotifications = async () => {
    if (typeof Notification === "undefined") {
      setMessage("Browser notifications are not supported here.");
      return;
    }
    const permission = await Notification.requestPermission();
    const granted = permission === "granted";
    setNotificationsEnabled(granted);
    setMessage(granted ? "Reminders enabled." : "Notifications were blocked.");
  };

  const pushLocalThenHydrate = async (userId: string) => {
    if (!supabaseAvailable) return;
    setSyncing(true);

    const remote = await fetchRemoteChallenges();
    const local = loadChallenges();

    if (remote.length > 0 && local.length > 0) {
      setConflict({ local, remote });
      setMessage("Found data in cloud and on this device. Choose how to merge.");
      setSyncing(false);
      return;
    }

    if (remote.length > 0) {
      setChallenges(remote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      setMessage("Synced from cloud.");
      setSyncing(false);
      return;
    }

    if (local.length > 0) {
      await Promise.all(local.map((c) => upsertChallenge(c, userId)));
      const refreshed = await fetchRemoteChallenges();
      if (refreshed.length > 0) {
        setChallenges(refreshed);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(refreshed));
        setMessage("Uploaded local data to cloud.");
      }
      setSyncing(false);
      return;
    }

    setMessage("");
    setSyncing(false);
  };

  const signInWithEmail = async (email: string) => {
    if (authBusy) return;
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }
    setAuthBusy(true);
    setUserEmail(email);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      const friendly =
        error.status === 429
          ? "Too many login emails. Wait a minute and try again."
          : error.message;
      setMessage(friendly);
    } else {
      setMessage("Magic link sent. Check your email to finish sign-in.");
    }
    setAuthBusy(false);
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setMessage("Signed out.");
    setAuthBusy(false);
  };

  const mergeChallenges = (local: Challenge[], remote: Challenge[]) => {
    const map = new Map<string, Challenge>();
    remote.forEach((c) => map.set(c.id, c));
    local.forEach((c) => {
      const existing = map.get(c.id);
      if (!existing) {
        map.set(c.id, c);
        return;
      }
      const existingTime = existing.updatedAt ? Date.parse(existing.updatedAt) : 0;
      const localTime = c.updatedAt ? Date.parse(c.updatedAt) : 0;
      if (localTime > existingTime) {
        map.set(c.id, c);
      }
    });
    return Array.from(map.values());
  };

  const resolveConflict = async (strategy: "remote" | "local" | "merge") => {
    if (!conflict || !session) return;
    setSyncing(true);

    let chosen: Challenge[] = [];
    if (strategy === "remote") chosen = conflict.remote;
    if (strategy === "local") chosen = conflict.local;
    if (strategy === "merge") chosen = mergeChallenges(conflict.local, conflict.remote);

    setChallenges(chosen);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chosen));
    await Promise.all(chosen.map((c) => upsertChallenge(c, session.user.id)));
    setConflict(null);
    setMessage(
      strategy === "merge"
        ? "Merged local and cloud data."
        : strategy === "remote"
          ? "Using cloud data."
          : "Uploaded this device data to cloud.",
    );
    setSyncing(false);
  };

  const downloadCalendar = (challenge: Challenge) => {
    const blob = new Blob([buildIcs(challenge)], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName =
      challenge.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "challenge";
    link.href = url;
    link.download = `${safeName}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
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
      setAuthBusy,
      resolveConflict,
    },
    helpers: {
      templates: defaultTemplates,
    },
  };
};

export const buildProgress = (
  challenge: Challenge,
  reference = new Date(),
): Progress => {
  const elapsed = daysBetween(challenge.startDate, reference);
  const expected = elapsed < 0 ? 0 : Math.min(challenge.totalDays, elapsed + 1);
  const done = Object.entries(challenge.entries).reduce(
    (count, [date, isDone]) => {
      if (!isDone) return count;
      return toDate(date) >= toDate(challenge.startDate) ? count + 1 : count;
    },
    0,
  );

  const percent =
    challenge.totalDays === 0
      ? 0
      : Math.min(100, Math.round((done / challenge.totalDays) * 100));
  const status: Progress["status"] =
    done >= challenge.totalDays
      ? "completed"
      : expected > done
        ? "behind"
        : "on-track";

  return { done, expected, percent, status };
};
