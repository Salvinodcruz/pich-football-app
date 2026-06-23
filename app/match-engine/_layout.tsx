import { Stack } from 'expo-router';
import { MatchEngineProvider } from '@/src/context/MatchEngineContext';

export default function MatchEngineLayout() {
  return (
    <MatchEngineProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#050505' },
        }}
      >
        <Stack.Screen name="setup" />
        <Stack.Screen name="live" />
        <Stack.Screen name="post-match" />
      </Stack>
    </MatchEngineProvider>
  );
}
