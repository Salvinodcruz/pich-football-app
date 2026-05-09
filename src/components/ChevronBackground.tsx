import React from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Svg, { Polygon, Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

export default function ChevronBackground() {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Polygon points={`0,0 ${W},0 ${W},${H} 0,${H}`} fill="#0A0A0A" />
        <Polygon points={`-50,0 ${W * 0.5},0 ${W * 1.2},${H} ${W * 0.5},${H}`} fill="#0F0F0F" />
        <Polygon points={`${W * 0.4},0 ${W * 0.9},0 ${W * 1.5},${H} ${W},${H}`} fill="#0D0D0D" />
        <Polygon points={`10,120 ${W / 2},20 ${W - 10},120 ${W - 10},140 ${W / 2},40 10,140`} fill="#141414" />
        <Polygon points={`10,150 ${W / 2},50 ${W - 10},150 ${W - 10},168 ${W / 2},68 10,168`} fill="#121212" />
        <Polygon points={`10,300 ${W / 2},200 ${W - 10},300 ${W - 10},320 ${W / 2},220 10,320`} fill="#141414" />
        <Polygon points={`10,330 ${W / 2},230 ${W - 10},330 ${W - 10},348 ${W / 2},248 10,348`} fill="#121212" />
        <Polygon points={`10,480 ${W / 2},380 ${W - 10},480 ${W - 10},500 ${W / 2},400 10,500`} fill="#141414" />
        <Polygon points={`10,510 ${W / 2},410 ${W - 10},510 ${W - 10},528 ${W / 2},428 10,528`} fill="#121212" />
        <Polygon points={`10,660 ${W / 2},560 ${W - 10},660 ${W - 10},680 ${W / 2},580 10,680`} fill="#141414" />
        <Polygon points={`10,690 ${W / 2},590 ${W - 10},690 ${W - 10},708 ${W / 2},608 10,708`} fill="#121212" />
        <Polygon points={`10,840 ${W / 2},740 ${W - 10},840 ${W - 10},860 ${W / 2},760 10,860`} fill="#141414" />
        <Line x1="-50" y1="0" x2={`${W * 0.6}`} y2={`${H}`} stroke="#161616" strokeWidth="1" />
        <Line x1={`${W * 0.2}`} y1="0" x2={`${W * 1.1}`} y2={`${H}`} stroke="#151515" strokeWidth="1" />
      </Svg>
    </View>
  );
}