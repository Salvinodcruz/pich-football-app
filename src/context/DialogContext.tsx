import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomDialog from '@/src/components/CustomDialog';

interface DialogButton {
  text: string;
  onPress?: () => void;
  color?: string;
  style?: 'default' | 'destructive' | 'cancel';
}

interface DialogConfig {
  title: string;
  message?: string;
  buttons?: DialogButton[];
}

interface DialogContextType {
  showAlert: (config: DialogConfig | string, message?: string, buttons?: DialogButton[]) => void;
  hideAlert: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig>({ title: '', message: '', buttons: [] });

  const showAlert = (conf: DialogConfig | string, message?: string, buttons?: DialogButton[]) => {
    if (typeof conf === 'string') {
      setConfig({
        title: conf,
        message: message || '',
        buttons: buttons || [{ text: 'OK', onPress: hideAlert }]
      });
    } else {
      setConfig({
        ...conf,
        buttons: conf.buttons || [{ text: 'OK', onPress: hideAlert }]
      });
    }
    setVisible(true);
  };

  const hideAlert = () => setVisible(false);

  // Wrap button onpress to hide dialog
  const processedButtons = config.buttons?.map(btn => ({
    ...btn,
    onPress: () => {
      if (btn.onPress) btn.onPress();
      hideAlert();
    }
  })) || [];

  return (
    <DialogContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomDialog
        visible={visible}
        title={config.title}
        message={config.message}
        buttons={processedButtons}
        onClose={hideAlert}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
