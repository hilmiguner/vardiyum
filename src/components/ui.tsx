import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { usePalette } from '../theme/colors';

export function Page({
  children,
  title,
  subtitle,
  settings = true,
}: PropsWithChildren<{
  title: string;
  subtitle?: string;
  settings?: boolean;
}>) {
  const palette = usePalette();
  const { t } = useTranslation();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: palette.bg }}
      edges={settings ? ['top', 'left', 'right'] : ['top', 'right', 'bottom', 'left']}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36, gap: 18 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontSize: 30, fontWeight: '800' }}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: palette.muted, marginTop: 6 }}>{subtitle}</Text>
            ) : null}
          </View>
          {settings ? (
            <Link href="/settings" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('settings')}
                style={{ padding: 12, backgroundColor: palette.card, borderRadius: 14 }}
              >
                <Text style={{ color: palette.text, fontSize: 19 }}>⚙</Text>
              </Pressable>
            </Link>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Panel({ children }: PropsWithChildren) {
  const c = usePalette();
  return (
    <View
      style={{
        padding: 18,
        backgroundColor: c.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.border,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={{ color: c.text, fontSize: 19, fontWeight: '700' }}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  const c = usePalette();
  return <Text style={{ color: c.muted, fontSize: 14, lineHeight: 21 }}>{children}</Text>;
}

export function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 15,
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: c.accent,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <Text style={{ color: c.bg, fontSize: 16, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}
