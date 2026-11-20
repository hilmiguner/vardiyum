import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  // On Android 3-button navigation, padding inside the bar alone can leave
  // the tab touch targets under the OS navigation controls. Reserve the
  // actual bottom safe area OUTSIDE the tab navigator instead.
  const isAndroid = Platform.OS === 'android';
  const bottomInset = isAndroid ? 0 : Math.max(insets.bottom, 8);
  return (
    <SafeAreaView
      edges={isAndroid ? ['bottom'] : []}
      style={{ flex: 1, backgroundColor: c.card }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.muted,
          // Uniform backgrounds prevent an oversized selected-tab block.
          tabBarActiveBackgroundColor: c.card,
          tabBarInactiveBackgroundColor: c.card,
          tabBarLabelPosition: 'below-icon',
          tabBarItemStyle: { alignItems: 'center', justifyContent: 'center' },
          tabBarStyle: {
            backgroundColor: c.card,
            borderTopColor: c.border,
            height: 56 + bottomInset,
            paddingTop: 8,
            paddingBottom: isAndroid ? 8 : bottomInset,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
        }}
      >
        {(['index', 'calendar', 'routines', 'earnings'] as const).map((name) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(name === 'index' ? 'today' : name),
              tabBarIcon: ({ color }) => (
                <Text
                  style={{
                    color,
                    fontSize: 20,
                    width: 28,
                    height: 28,
                    lineHeight: 28,
                    textAlign: 'center',
                    textAlignVertical: 'center',
                    includeFontPadding: false,
                  }}
                >
                  {icons[name]}
                </Text>
              ),
            }}
          />
        ))}
      </Tabs>
    </SafeAreaView>
  );
}
