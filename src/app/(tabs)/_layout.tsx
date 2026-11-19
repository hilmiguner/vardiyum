import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePalette } from '../../theme/colors';

const icons: Record<string, string> = {
  index: '◉',
  calendar: '▦',
  routines: '☑',
  earnings: '₺',
};

export default function TabLayout() {
  const { t } = useTranslation();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
          height: 56 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      {(['index', 'calendar', 'routines', 'earnings'] as const).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(name === 'index' ? 'today' : name),
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 20 }}>{icons[name]}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
