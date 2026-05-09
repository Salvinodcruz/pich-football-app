import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Svg, { Rect, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming, 
  interpolate 
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

export default function PremiumBackground() {
  const anim1 = useSharedValue(0);
  const anim2 = useSharedValue(0);

  useEffect(() => {
    anim1.value = withRepeat(withTiming(1, { duration: 10000 }), -1, true);
    anim2.value = withRepeat(withTiming(1, { duration: 8000 }), -1, true);
  }, []);

  const blob1Props = useAnimatedProps(() => ({
    cx: interpolate(anim1.value, [0, 1], [W * 0.2, W * 0.8]),
    cy: interpolate(anim2.value, [0, 1], [H * 0.2, H * 0.4]),
    rx: interpolate(anim1.value, [0, 1], [W * 0.4, W * 0.6]),
    ry: interpolate(anim2.value, [0, 1], [W * 0.4, W * 0.6]),
  }));

  const blob2Props = useAnimatedProps(() => ({
    cx: interpolate(anim2.value, [0, 1], [W * 0.8, W * 0.2]),
    cy: interpolate(anim1.value, [0, 1], [H * 0.7, H * 0.5]),
    rx: interpolate(anim2.value, [0, 1], [W * 0.5, W * 0.7]),
    ry: interpolate(anim1.value, [0, 1], [W * 0.5, W * 0.7]),
  }));

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient id="grad1" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#00E676" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#00E676" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="grad2" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#00B0FF" stopOpacity="0.1" />
            <Stop offset="100%" stopColor="#00B0FF" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={H} fill="#050505" />
        <AnimatedEllipse animatedProps={blob1Props} fill="url(#grad1)" />
        <AnimatedEllipse animatedProps={blob2Props} fill="url(#grad2)" />
        
        {/* Subtle grid pattern */}
        {[...Array(20)].map((_, i) => (
          <Rect
            key={`v-${i}`}
            x={(W / 20) * i}
            y="0"
            width="0.5"
            height={H}
            fill="#FFFFFF"
            opacity={0.03}
          />
        ))}
        {[...Array(40)].map((_, i) => (
          <Rect
            key={`h-${i}`}
            x="0"
            y={(H / 40) * i}
            width={W}
            height="0.5"
            fill="#FFFFFF"
            opacity={0.03}
          />
        ))}
      </Svg>
    </View>
  );
}
