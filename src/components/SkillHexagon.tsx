import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Text as SvgText, G } from 'react-native-svg';
import { Colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIZE = SCREEN_WIDTH * 0.55;
const CENTER = SIZE / 2;
const RADIUS = CENTER * 0.8;

interface SkillHexagonProps {
  stats: {
    attack: number;     // 0-100
    defense: number;    // 0-100
    speed: number;      // 0-100
    passing: number;    // 0-100
    stamina: number;    // 0-100
  };
  color?: string;
}

export default function SkillHexagon({ stats, color = Colors.dark.tint }: SkillHexagonProps) {
  const points = [
    { label: 'ATT', value: stats.attack },
    { label: 'DEF', value: stats.defense },
    { label: 'SPD', value: stats.speed },
    { label: 'PAS', value: stats.passing },
    { label: 'STA', value: stats.stamina },
  ];

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / points.length - Math.PI / 2;
    const r = (value / 100) * RADIUS;
    return {
      x: CENTER + r * Math.cos(angle),
      y: CENTER + r * Math.sin(angle),
    };
  };

  const dataPoints = points.map((p, i) => {
    const coords = getCoordinates(i, p.value);
    return `${coords.x},${coords.y}`;
  }).join(' ');

  const axisLines = points.map((_, i) => {
    const coords = getCoordinates(i, 100);
    return { x2: coords.x, y2: coords.y };
  });

  const webLevel = (val: number) => {
    return points.map((_, i) => {
      const coords = getCoordinates(i, val);
      return `${coords.x},${coords.y}`;
    }).join(' ');
  };

  return (
    <View style={styles.container}>
      <Svg width={SIZE} height={SIZE}>
        <G>
          {/* Background Web */}
          {[20, 40, 60, 80, 100].map((level) => (
            <Polygon
              key={level}
              points={webLevel(level)}
              fill="transparent"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          ))}

          {/* Axis Lines */}
          {axisLines.map((line, i) => (
            <Line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={line.x2}
              y2={line.y2}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
          ))}

          {/* Labels */}
          {points.map((p, i) => {
            const coords = getCoordinates(i, 115);
            return (
              <SvgText
                key={p.label}
                x={coords.x}
                y={coords.y}
                fill="rgba(255,255,255,0.4)"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {p.label}
              </SvgText>
            );
          })}

          {/* Data Shape */}
          <Polygon
            points={dataPoints}
            fill={`${color}33`}
            stroke={color}
            strokeWidth="2"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const coords = getCoordinates(i, p.value);
            return (
              <G key={`pt-${i}`}>
                <Polygon
                  points={`${coords.x-2},${coords.y-2} ${coords.x+2},${coords.y-2} ${coords.x+2},${coords.y+2} ${coords.x-2},${coords.y+2}`}
                  fill="#FFF"
                />
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
});
