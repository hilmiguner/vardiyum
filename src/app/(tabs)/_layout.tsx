import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { usePalette } from '../../theme/colors';

const tabEntries = [
  { name: 'index', titleKey: 'today', glyph: '◉' },
  { name: 'calendar', titleKey: 'calendar', glyph: '▦' },
  { name: 'routines', titleKey: 'routines', glyph: '☑' },
  { name: 'earnings', titleKey: 'earnings', glyph: '₺' },
] as const;

export default function TabLayout() {
  const { t } = useTranslation();
  const c = usePalette();

  return (
    // Reserve system navigation space OUTSIDE the tab bar on Android and iOS.
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: c.card }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={({ state, descriptors, navigation }) => (
          // Keep full control over button geometry. The default bottom tab
          // layout shifted the glyph + label group toward the OS navigation.
          <View
            style={{
              height: 64,
              flexDirection: 'row',
              backgroundColor: c.card,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}
          >
            {state.routes.map((route, index) => {
              const tab = tabEntries.find((entry) => entry.name === route.name);
              const label = tab ? t(tab.titleKey) : route.name;
              const focused = state.index === index;
              const options = descriptors[route.key].options;
              const color = focused ? c.accent : c.muted;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                  testID={options.tabBarButtonTestID ?? `tab-${route.name}`}
                  onPress={onPress}
                  onLongPress={() => {
                    navigation.emit({ type: 'tabLongPress', target: route.key });
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 28,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color,
                        fontSize: 20,
                        width: 30,
                        height: 26,
                        lineHeight: 26,
                        textAlign: 'center',
                        textAlignVertical: 'center',
                        includeFontPadding: false,
                      }}
                    >
                      {tab?.glyph ?? '•'}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={{
                      color,
                      fontSize: 12,
                      lineHeight: 16,
                      fontWeight: focused ? '700' : '600',
                      textAlign: 'center',
                      includeFontPadding: false,
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      >
        {tabEntries.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ title: t(tab.titleKey) }} />
        ))}
      </Tabs>
    </SafeAreaView>
  );
}
