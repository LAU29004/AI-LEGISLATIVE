// App.tsx — Root Navigator with Bottom Nav

import {
  Sora_300Light,
  Sora_400Regular,
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  useFonts,
} from "@expo-google-fonts/sora";
import React, { useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import BottomNav from "./BottomNav";
import { Colors } from "./constants/theme";
import ChatScreen from "./screens/ChatScreen";
import ExploreScreen from "./screens/ExploreScreen";
import HomeScreen from "./screens/HomeScreen";
import InsightsScreen from "./screens/InsightsScreen";
import ProfileScreen from "./screens/ProfileScreen";

export type TabName = "Home" | "Insights" | "AI" | "Explore" | "Profile";

const SCREENS: Record<TabName, React.ComponentType<any>> = {
  Home: HomeScreen,
  Explore: ExploreScreen,
  AI: ChatScreen,
  Insights: InsightsScreen,
  Profile: ProfileScreen,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>("Home");

  const [fontsLoaded] = useFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
  });

  if (!fontsLoaded) return null;

  const ActiveScreen = SCREENS[activeTab];

  // Fake navigation object so screens can switch tabs
  const navigation = {
    navigate: (tab: TabName) => setActiveTab(tab),
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={s.root}>
        <ActiveScreen navigation={navigation} />
        <BottomNav
          activeTab={activeTab}
          onTabPress={setActiveTab as (name: TabName) => void}
        />
      </View>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
});

// ─── Required packages ─────────────────────────────────────────────────────────
//
//  expo install expo-linear-gradient expo-blur expo-font
//  expo install react-native-safe-area-context
//  npx expo install @expo-google-fonts/sora
//  expo install @expo/vector-icons
//
// app.json — add to "plugins":
//   ["expo-font"]
