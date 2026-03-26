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
          height: Platform.OS === "android" ? 52 : 72,
          paddingBottom: Platform.OS === "android" ? 4 : 20,
          paddingTop: 4,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color }) => (
            <CheckSquare size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Notes",
          tabBarIcon: ({ color }) => (
            <StickyNote size={18} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarIcon: ({ color }) => <Zap size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="morning"
        options={{
          title: "Morning",
          tabBarIcon: ({ color }) => <Sun size={18} color={color} />,
        }}
      />
      {/* Hide signals tab - signals are inline on Home */}
      <Tabs.Screen
        name="signals"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
