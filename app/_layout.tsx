import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/src/config/firebase';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? 'signed in' : 'signed out');
    });
    return unsubscribe;
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#0D0D0D' },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: '#0D0D0D' },
            gestureEnabled: false,
            fullScreenGestureEnabled: false,
            animation: 'slide_from_right',
          }}
        >
          {/* Auth screens */}
          <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="signup" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="profile-setup" options={{ headerShown: false, gestureEnabled: false }} />

          {/* Main tabs */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />

          {/* Detail screens — swipe back enabled */}
          <Stack.Screen name="create-team" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="team/[id]" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="send-challenge" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="challenges" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="create-tournament" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="tournament/[id]" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="submit-result" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="free-agents" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="report-team" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="match-map" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="notifications" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="edit-match" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="messages" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="direct-chat/[id]" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="friends" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="friend-dm/[id]" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="create-pickup" options={{ headerShown: false, gestureEnabled: true }} />
          <Stack.Screen name="chat-team/[id]" options={{ headerShown: false, gestureEnabled: true }} />
        </Stack>
        <StatusBar style="light" backgroundColor="#0D0D0D" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}