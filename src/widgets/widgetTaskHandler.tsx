import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { QuickCaptureWidget } from "./QuickCaptureWidget";
import { SignalToggleWidget } from "./SignalToggleWidget";
import { TodaySummaryWidget } from "./TodaySummaryWidget";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

const WIDGET_NAMES = {
  QuickCapture: "QuickCaptureWidget",
  SignalToggle: "SignalToggleWidget",
  TodaySummary: "TodaySummaryWidget",
} as const;

async function getWidgetData() {
  try {
    const data = await AsyncStorage.getItem("widget_data");
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function renderForWidget(
  props: WidgetTaskHandlerProps,
  data: Record<string, any>
) {
  const name = props.widgetInfo.widgetName;
  if (name === WIDGET_NAMES.QuickCapture) {
    props.renderWidget(<QuickCaptureWidget />);
  } else if (name === WIDGET_NAMES.SignalToggle) {
    props.renderWidget(
      <SignalToggleWidget
        signals={data.binarySignals || {}}
        signalLabels={data.signalLabels || {}}
      />
    );
  } else if (name === WIDGET_NAMES.TodaySummary) {
    props.renderWidget(
      <TodaySummaryWidget
        focusHours={data.focusHours || 0}
        tasksRemaining={data.tasksRemaining || 0}
        signalScore={data.signalScore || 0}
      />
    );
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const data = await getWidgetData();
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
      if (action === "OPEN_HOME") {
        Linking.openURL("flowmatic:///");
        break;
      }
      if (action?.startsWith("TOGGLE_SIGNAL_")) {
        const metric = action.replace("TOGGLE_SIGNAL_", "");
        const currentValue = props.clickActionData?.currentValue === "true";
        const newValue = !currentValue;

        // Store toggle request for the app to process via API
        try {
          await AsyncStorage.setItem(
            "widget_signal_toggle",
            JSON.stringify({
              metric,
              value: newValue,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore
        }

        // Update cached widget data and re-render immediately
        const data = await getWidgetData();
        if (!data.binarySignals) data.binarySignals = {};
        data.binarySignals[metric] = newValue;
        await AsyncStorage.setItem("widget_data", JSON.stringify(data));
        renderForWidget(props, data);
        break;
      }
      break;
    }

    default:
      break;
  }
}
