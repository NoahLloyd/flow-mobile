import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { QuickCaptureWidget } from "./QuickCaptureWidget";
import { QuickAddTaskWidget } from "./QuickAddTaskWidget";
import { QuickAddNoteWidget } from "./QuickAddNoteWidget";
import { DailyTasksWidget } from "./DailyTasksWidget";
import { StartFocusWidget } from "./StartFocusWidget";
import { SignalStreakWidget } from "./SignalStreakWidget";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import { api } from "../lib/api";

const WIDGET_NAMES = {
  QuickCapture: "QuickCaptureWidget",
  QuickAddTask: "QuickAddTaskWidget",
  QuickAddNote: "QuickAddNoteWidget",
  DailyTasks: "DailyTasksWidget",
  StartFocus: "StartFocusWidget",
  SignalStreak: "SignalStreakWidget",
  SignalStreakCompact: "SignalStreakCompactWidget",
  SignalStreakWeek: "SignalStreakWeekWidget",
  SignalStreakRing: "SignalStreakRingWidget",
  SignalStreakScore: "SignalStreakScoreWidget",
  SignalStreakDuo: "SignalStreakDuoWidget",
  SignalStreakMini: "SignalStreakMiniWidget",
  SignalStreakFlame: "SignalStreakFlameWidget",
} as const;

async function getWidgetData() {
  try {
    const data = await AsyncStorage.getItem("widget_data");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/** Fetch fresh score/streak from the edge function and merge into widget data. */
async function refreshWidgetData(): Promise<Record<string, any>> {
  const cached = await getWidgetData();
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    const year = parts.find((p) => p.type === "year")?.value || "2024";
    const todayStr = `${year}-${month}-${day}`;

    const result = await api.computeDailyScore(todayStr, tz);
    const updated = {
      ...cached,
      signalStreak: result.streak.count,
      signalStreakGoalMet: result.score >= (cached.signalStreakGoal || 75),
      signalStreakDanger: result.streak.danger,
      signalStreakTodayScore: result.score,
      signalStreakPoints: result.streak.points,
    };
    await AsyncStorage.setItem("widget_data", JSON.stringify(updated));
    return updated;
  } catch {
    // Offline or auth expired — use cached data
    return cached;
  }
}

function renderForWidget(
  props: WidgetTaskHandlerProps,
  data: Record<string, any>
) {
  const name = props.widgetInfo.widgetName;
  if (name === WIDGET_NAMES.QuickCapture) {
    props.renderWidget(<QuickCaptureWidget />);
  } else if (name === WIDGET_NAMES.QuickAddTask) {
    props.renderWidget(<QuickAddTaskWidget />);
  } else if (name === WIDGET_NAMES.QuickAddNote) {
    props.renderWidget(<QuickAddNoteWidget />);
  } else if (name === WIDGET_NAMES.DailyTasks) {
    props.renderWidget(
      <DailyTasksWidget tasks={data.dailyTasks || []} />
    );
  } else if (name === WIDGET_NAMES.StartFocus) {
    props.renderWidget(<StartFocusWidget />);
  } else if (name === WIDGET_NAMES.SignalStreak) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        variant="bold"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakCompact) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        variant="compact"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakWeek) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        week={data.signalStreakWeek || []}
        variant="week"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakRing) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        todayScore={data.signalStreakTodayScore || 0}
        goal={data.signalStreakGoal || 75}
        variant="ring"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakScore) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        todayScore={data.signalStreakTodayScore || 0}
        goal={data.signalStreakGoal || 75}
        variant="score"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakDuo) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        variant="duo"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakMini) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        variant="mini"
      />
    );
  } else if (name === WIDGET_NAMES.SignalStreakFlame) {
    props.renderWidget(
      <SignalStreakWidget
        streak={data.signalStreak || 0}
        goalMet={data.signalStreakGoalMet || false}
        isDanger={data.signalStreakDanger || false}
        variant="flame"
      />
    );
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_RESIZED": {
      const data = await getWidgetData();
      renderForWidget(props, data);
      break;
    }

    case "WIDGET_UPDATE": {
      // Periodic update — fetch fresh data from the edge function
      const data = await refreshWidgetData();
      renderForWidget(props, data);
      break;
    }

    case "WIDGET_CLICK": {
      const action = props.clickAction;

      if (action === "OPEN_CAPTURE_TASK") {
        Linking.openURL("flowmatic:///quick-add/task");
        break;
      }
      if (action === "OPEN_CAPTURE_NOTE") {
        Linking.openURL("flowmatic:///quick-add/note");
        break;
      }
      if (action === "OPEN_TIMER") {
        Linking.openURL("flowmatic:///session/timer");
        break;
      }
      if (action === "OPEN_TASKS") {
        Linking.openURL("flowmatic:///(tabs)/tasks");
        break;
      }
      if (action === "OPEN_SIGNALS") {
        Linking.openURL("flowmatic:///(tabs)/signals");
        break;
      }
      if (action === "COMPLETE_TASK") {
        const taskId = props.clickActionData?.taskId;
        if (taskId) {
          try {
            await AsyncStorage.setItem(
              "widget_complete_task",
              JSON.stringify({ taskId, timestamp: Date.now() })
            );
            // Remove task from widget data and re-render
            const data = await getWidgetData();
            if (data.dailyTasks) {
              data.dailyTasks = data.dailyTasks.filter(
                (t: any) => t.id !== taskId
              );
              await AsyncStorage.setItem("widget_data", JSON.stringify(data));
            }
            renderForWidget(props, data);
          } catch {
            // ignore
          }
        }
        break;
      }
      break;
    }

    default:
      break;
  }
}
