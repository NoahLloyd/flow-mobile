import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

interface DailyTasksWidgetProps {
  tasks?: { id: string; title: string }[];
}

export function DailyTasksWidget({ tasks = [] }: DailyTasksWidgetProps) {
  if (tasks.length === 0) {
    return (
      <FlexWidget
        clickAction="OPEN_TASKS"
        style={{
          height: "match_parent",
          width: "match_parent",
          backgroundColor: "#0c1220",
          borderRadius: 12,
          padding: 12,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TextWidget
          text="All done!"
          style={{ fontSize: 14, color: "#94a3b8" }}
        />
      </FlexWidget>
    );
  }

  const visible = tasks.slice(0, 6);
  const remaining = tasks.length - visible.length;

  return (
    <FlexWidget
      clickAction="OPEN_TASKS"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#0c1220",
        borderRadius: 12,
        padding: 10,
        flexDirection: "column",
        flexGap: 2,
      }}
    >
      {visible.map((task) => (
        <FlexWidget
          key={task.id}
          style={{
            width: "match_parent",
            flexDirection: "row",
            alignItems: "center",
            flexGap: 8,
            paddingVertical: 4,
          }}
        >
          <FlexWidget
            clickAction="COMPLETE_TASK"
            clickActionData={{ taskId: task.id }}
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              borderWidth: 2,
              borderColor: "#334155",
              justifyContent: "center",
              alignItems: "center",
            }}
          />
          <FlexWidget
            clickAction="OPEN_TASKS"
            style={{ flex: 1 }}
          >
            <TextWidget
              text={task.title}
              style={{ fontSize: 13, color: "#f1f5f9" }}
              maxLines={1}
            />
          </FlexWidget>
        </FlexWidget>
      ))}
      {remaining > 0 && (
        <FlexWidget
          clickAction="OPEN_TASKS"
          style={{ width: "match_parent", paddingTop: 2 }}
        >
          <TextWidget
            text={`+${remaining} more`}
            style={{ fontSize: 11, color: "#64748b" }}
          />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
