// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols → Material Icons mappings (used on Android & web).
 * Add any new SF Symbol name used in the codebase here so icons
 * render correctly on non-iOS platforms.
 * - Icons directory: https://icons.expo.fyi
 */
const MAPPING = {
  // Navigation tabs
  'house.fill': 'home',
  'magnifyingglass': 'search',
  'trophy.fill': 'emoji-events',
  'person.2.fill': 'group',
  'person.fill': 'person',
  // Common UI
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'bell.fill': 'notifications',
  'gear': 'settings',
  'star.fill': 'star',
  'location.fill': 'place',
  'calendar': 'calendar-today',
  'video.fill': 'videocam',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
