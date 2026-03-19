import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

interface TodaySummaryWidgetProps {
  focusHours?: number;
  tasksRemaining?: number;
  signalScore?: number;
}

export function TodaySummaryWidget({
  focusHours = 0,
  tasksRemaining = 0,
  signalScore = 0,
}: TodaySummaryWidgetProps) {
  return (
    <FlexWidget
      clickAction="OPEN_HOME"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#141414",
        borderRadius: 16,
        padding: 16,
        justifyContent: "space-between",
      }}
    >
      <TextWidget
        text="Flowmatic"
        style={{ fontSize: 12, color: "#666666", fontWeight: "500" }}
      />
      <FlexWidget
        style={{
          width: "match_parent",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <FlexWidget style={{ alignItems: "flex-start" }}>
          <TextWidget
            text={`${focusHours.toFixed(1)}h`}
            style={{ fontSize: 28, color: "#f5f5f5", fontWeight: "700" }}
          />
          <TextWidget
            text="focus today"
            style={{ fontSize: 11, color: "#a0a0a0" }}
          />
        </FlexWidget>
        <FlexWidget style={{ alignItems: "center" }}>
          <TextWidget
            text={String(tasksRemaining)}
            style={{ fontSize: 22, color: "#f5f5f5", fontWeight: "700" }}
          />
          <TextWidget
            text="tasks"
            style={{ fontSize: 11, color: "#a0a0a0" }}
          />
        </FlexWidget>
        <FlexWidget style={{ alignItems: "flex-end" }}>
          <TextWidget
            text={`${signalScore}%`}
            style={{ fontSize: 22, color: "#6366f1", fontWeight: "700" }}
          />
          <TextWidget
            text="signals"
            style={{ fontSize: 11, color: "#a0a0a0" }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
