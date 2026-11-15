import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { usePalette } from '../../theme/colors';

const icons: Record<string, string> = {
  index: '◉', calendar: '▦', routines: '☑', earnings: '₺',
};

export default function TabLayout() {
  const { t } = useTranslation();
  const c = usePalette();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border, height: 64, paddingTop: 8 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
    }}>
      {(['index', 'calendar', 'routines', 'earnings'] as const).map((name) => (
        <Tabs.Screen key={name} name={name} options={{
          title: t(name === 'index' ? 'today' : name),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>{icons[name]}</Text>,
        }} />
      ))}
    </Tabs>
  );
}
