// app/index.tsx — Root layout: Login gate + full navigation stack

import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import BottomNav, { TabName } from "../BottomNav";
import { ThemeProvider } from "../context/ThemeContext";
import { Bill } from "../data/bill";
import { Policy } from "../data/Policies";
import BillDetailsScreen from "../screens/BillDetailsScreen";
import ChatScreen from "../screens/ChatScreen";
import ExploreScreen from "../screens/ExploreScreen";
import HomeScreen from "../screens/HomeScreen";
import InsightsScreen from "../screens/InsightsScreen";
import LoginScreen from "../screens/LoginScreen";
import PolicyDetailsScreen from "../screens/Policydetailsscreen";
import ProfileScreen from "../screens/ProfileScreen";

// ─── Navigation state ─────────────────────────────────────────────────────────

type Screen =
  | { name: "tabs" }
  | { name: "billDetails"; bill: Bill }
  | { name: "policyDetails"; policy: Policy }
  | { name: "chat"; bill?: Bill; policy?: Policy };

// ─── Authenticated app ────────────────────────────────────────────────────────

function AuthenticatedApp() {
  const [activeTab, setActiveTab] = useState<TabName>("Home");
  const [screen, setScreen] = useState<Screen>({ name: "tabs" });

  const hideNav =
    screen.name === "billDetails" ||
    screen.name === "policyDetails" ||
    screen.name === "chat" ||
    activeTab === "AI";

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          // Parent will reset isLoggedIn
        },
      },
    ]);
  };

  // Bill flow
  const openBill = (bill: Bill) => setScreen({ name: "billDetails", bill });
  const chatFromBill = (bill: Bill) => setScreen({ name: "chat", bill });

  // Policy flow
  const openPolicy = (policy: Policy) =>
    setScreen({ name: "policyDetails", policy });
  const chatFromPolicy = (policy: Policy) =>
    setScreen({ name: "chat", policy });

  // Back
  const goTabs = () => setScreen({ name: "tabs" });

  // Full-screen stacks
  if (screen.name === "billDetails") {
    return (
      <BillDetailsScreen
        bill={screen.bill}
        onBack={goTabs}
        onAskAI={chatFromBill}
      />
    );
  }

  if (screen.name === "policyDetails") {
    return (
      <PolicyDetailsScreen
        policy={screen.policy}
        onBack={goTabs}
        onAskAI={chatFromPolicy}
      />
    );
  }

  if (screen.name === "chat") {
    return (
      <ChatScreen
        onBack={goTabs}
        initialBill={screen.bill}
        initialPolicy={screen.policy}
      />
    );
  }

  // Tab screens
  const renderTab = () => {
    switch (activeTab) {
      case "Home":
        return <HomeScreen />;
      case "Insights":
        return <InsightsScreen onSelectPolicy={openPolicy} />;
      case "AI":
        return <ChatScreen onBack={() => setActiveTab("Home")} />;
      case "Explore":
        return <ExploreScreen onSelectBill={openBill} />;
      case "Profile":
        return <ProfileScreen onLogout={handleLogout} />;
    }
  };

  return (
    <View style={s.root}>
      {renderTab()}
      {!hideNav && (
        <BottomNav activeTab={activeTab} onTabPress={setActiveTab} />
      )}
    </View>
  );
}

// ─── Root with login gate ─────────────────────────────────────────────────────

function AppScreens() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return <AuthenticatedApp />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppScreens />
    </ThemeProvider>
  );
}

const s = StyleSheet.create({ root: { flex: 1 } });
