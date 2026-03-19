import { Tabs } from "expo-router";
import { Platform } from "react-native";
import {
  Home,
  Zap,
  CheckSquare,
  Sun,
  StickyNote,
} from "lucide-react-native";
import { colors, fontSize } from "../../src/lib/theme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bgSecondary,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "android" ? 64 : 84,
          paddingBottom: Platform.OS === "android" ? 8 : 28,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <CheckSquare size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color, size }) => (
            <StickyNote size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color, size }) => <Zap size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="morning"
        options={{
          title: "Morning",
          tabBarIcon: ({ color, size }) => <Sun size={size} color={color} />,
        }}
      />
      {/* Hide signals tab - signals are now inline on Home */}
      <Tabs.Screen
        name="signals"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
