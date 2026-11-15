import { useColorScheme } from 'react-native';

export const colors = {
  dark: {
    bg: '#0D1421',
    card: '#18243A',
    cardAlt: '#24324C',
    text: '#F1F5FC',
    muted: '#A8B5CC',
    accent: '#70B6FF',
    border: '#30415E',
    danger: '#F9A0A7',
  },
  light: {
    bg: '#F4F7FD',
    card: '#FFFFFF',
    cardAlt: '#E8F0FC',
    text: '#14253E',
    muted: '#536884',
    accent: '#1B66D4',
    border: '#CBD9EE',
    danger: '#BC3341',
  },
} as const;

export function usePalette() {
  const scheme = useColorScheme();
  return scheme === 'light' ? colors.light : colors.dark;
}
