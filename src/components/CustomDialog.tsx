import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Colors, Spacing, FontSizes, FontWeights, BorderRadius } from '@/constants/theme';

interface DialogButton {
  text: string;
  onPress: () => void;
  color?: string;
  style?: 'default' | 'destructive' | 'cancel';
}

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  onClose: () => void;
}

export default function CustomDialog({ visible, title, message, buttons, onClose }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <View style={styles.box}>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <View style={styles.buttons}>
          {buttons.map((btn, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.btn,
                btn.style === 'destructive' && styles.destructiveBtn,
                btn.style === 'cancel' && styles.cancelBtn,
                btn.color ? { backgroundColor: btn.color } : null,
              ]}
              onPress={btn.onPress}
            >
              <Text style={[
                styles.btnText,
                btn.style === 'cancel' && styles.cancelBtnText,
                btn.style === 'destructive' && styles.destructiveBtnText,
              ]}>
                {btn.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000BB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    zIndex: 9999,
    elevation: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  box: {
    backgroundColor: Colors.dark.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: Spacing.sm,
    zIndex: 10000,
    elevation: 10000,
  },
  title: {
    color: Colors.dark.text,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  message: {
    color: Colors.dark.textSecondary,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  buttons: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btn: {
    backgroundColor: Colors.dark.tint,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  destructiveBtn: {
    backgroundColor: '#FF444420',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  cancelBtn: {
    backgroundColor: Colors.dark.background,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  btnText: {
    color: '#000',
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
  },
  destructiveBtnText: {
    color: '#FF4444',
  },
  cancelBtnText: {
    color: Colors.dark.textSecondary,
  },
});